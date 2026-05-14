"""
Minimal PyTorch-only helpers for PTB-XL-style 1D CNN heads (inference).

Replaces the original `fastai.layers` / `fastai.core` dependencies used by
`xresnet1d.py` in the ecg_ptbxl_benchmarking codebase.
"""

from __future__ import annotations

from typing import Sequence

import torch
import torch.nn as nn
from torch.nn.utils import spectral_norm


def listify(o) -> list:
    if o is None:
        return []
    if isinstance(o, (list, tuple)):
        return list(o)
    return [o]


class Flatten(nn.Module):
    """Flatten batch to (batch, -1), matching the historical fastai `Flatten` module."""

    def __init__(self, full: bool = False):
        super().__init__()
        self.full = full

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        if self.full:
            return x.reshape(-1)
        return x.reshape(x.size(0), -1)


class AdaptiveConcatPool1d(nn.Module):
    """Concatenate adaptive max- and avg-pool along the channel dimension."""

    def __init__(self, size: int | None = None):
        super().__init__()
        sz = size or 1
        self.mp = nn.AdaptiveMaxPool1d(sz)
        self.ap = nn.AdaptiveAvgPool1d(sz)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return torch.cat([self.mp(x), self.ap(x)], 1)


def bn_drop_lin(
    n_in: int,
    n_out: int,
    bn: bool = True,
    p: float = 0.0,
    actn: nn.Module | None = None,
) -> list[nn.Module]:
    """BatchNorm → Dropout → Linear → optional activation (same idea as fastai `bn_drop_lin`)."""
    layers: list[nn.Module] = []
    if bn:
        layers.append(nn.BatchNorm1d(n_in))
    if p and p > 0:
        layers.append(nn.Dropout(p))
    layers.append(nn.Linear(n_in, n_out, bias=not bn))
    if actn is not None:
        layers.append(actn)
    return layers


def create_head1d(
    nf: int,
    nc: int,
    lin_ftrs: Sequence[int] | None = None,
    ps: float | Sequence[float] = 0.5,
    bn_final: bool = False,
    bn: bool = True,
    act: str = "relu",
    concat_pooling: bool = True,
) -> nn.Sequential:
    """Classifier head used by `XResNet1d` in the PTB-XL benchmarking models."""
    if lin_ftrs is None:
        lin_ftrs_list: list[int] = [2 * nf if concat_pooling else nf, nc]
    else:
        lin_ftrs_list = [2 * nf if concat_pooling else nf, *list(lin_ftrs), nc]

    ps_list = listify(ps)
    if len(ps_list) == 1:
        ps_list = [ps_list[0] / 2] * (len(lin_ftrs_list) - 2) + ps_list

    act_cls = nn.ReLU(inplace=True) if act == "relu" else nn.ELU(inplace=True)
    actns: list[nn.Module | None] = [act_cls] * (len(lin_ftrs_list) - 2) + [None]

    layers: list[nn.Module] = [
        AdaptiveConcatPool1d() if concat_pooling else nn.MaxPool1d(2),
        Flatten(),
    ]
    for ni, no, p, actn in zip(lin_ftrs_list[:-1], lin_ftrs_list[1:], ps_list, actns):
        layers.extend(bn_drop_lin(ni, no, bn=bn, p=p, actn=actn))
    if bn_final:
        layers.append(nn.BatchNorm1d(lin_ftrs_list[-1], momentum=0.01))
    return nn.Sequential(*layers)


def _conv1d_spect(ni: int, no: int, ks: int = 1, stride: int = 1, padding: int = 0, bias: bool = False) -> nn.Module:
    conv = nn.Conv1d(ni, no, ks, stride=stride, padding=padding, bias=bias)
    nn.init.kaiming_normal_(conv.weight)
    if bias and conv.bias is not None:
        conv.bias.data.zero_()
    return spectral_norm(conv)


class SimpleSelfAttention(nn.Module):
    """1D simple self-attention block (spectral-norm conv), as in fastai."""

    def __init__(self, n_in: int, ks: int = 1, sym: bool = False):
        super().__init__()
        self.sym = sym
        self.n_in = n_in
        self.conv = _conv1d_spect(n_in, n_in, ks, padding=ks // 2, bias=False)
        self.gamma = nn.Parameter(torch.zeros(1))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        if self.sym:
            c = self.conv.weight.view(self.n_in, self.n_in)
            c = (c + c.t()) / 2
            self.conv.weight.data = c.view(self.n_in, self.n_in, 1)

        size = x.size()
        x_flat = x.view(*size[:2], -1)
        convx = self.conv(x_flat)
        xxT = torch.bmm(x_flat, x_flat.permute(0, 2, 1).contiguous())
        o = torch.bmm(xxT, convx)
        o = self.gamma * o + x_flat
        return o.view(*size).contiguous()


class SEModule(nn.Module):
    """Squeeze-and-excitation (channel reweighting)."""

    def __init__(self, ch: int, reduction: int, act_cls: type[nn.Module] = nn.ReLU):
        super().__init__()
        nf = max(ch // reduction, 8)
        act_layer = act_cls(inplace=True) if act_cls is nn.ReLU else act_cls()
        self.net = nn.Sequential(
            nn.Linear(ch, nf, bias=False),
            act_layer,
            nn.Linear(nf, ch, bias=False),
            nn.Sigmoid(),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        b, c, _ = x.size()
        y = x.mean(dim=2)
        y = self.net(y).view(b, c, 1)
        return x * y


def weight_init(m: nn.Module) -> None:
    """Kaiming init for Conv1d / Linear (used by legacy training wrappers)."""
    if isinstance(m, (nn.Conv1d, nn.Linear)):
        nn.init.kaiming_normal_(m.weight)
        if m.bias is not None:
            nn.init.zeros_(m.bias)
    if isinstance(m, nn.BatchNorm1d):
        nn.init.constant_(m.weight, 1)
        nn.init.constant_(m.bias, 0)
