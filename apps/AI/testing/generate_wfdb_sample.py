"""
Generate a 12-lead PTB-XL-compatible WFDB ECG (.dat + .hea)
-------------------------------------------------------------
The ECG pipeline requires AT LEAST 12 signal channels.
This script generates a proper 12-lead WFDB recording.

Standard 12 leads: I, II, III, aVR, aVL, aVF, V1, V2, V3, V4, V5, V6

Patient profile:
  - Heart disease confirmed (target = 1)
  - Borderline/atypical presentation -> model gives ~17% probability
  - Clinical markers: mild ST depression, flat T-wave, HR 88 bpm

Run:
    python generate_wfdb_sample.py

Output:
    patient_hd_ecg17.dat   (12-lead binary, format 16)
    patient_hd_ecg17.hea   (WFDB header)
"""

import struct
import math
import random
import os

# ── Parameters ─────────────────────────────────────────────────────────────
OUTPUT_NAME = "patient_hd_ecg17"
FS          = 500          # PTB-XL uses 500 Hz
DURATION    = 10           # 10 seconds  -> 5000 samples per lead
N_SAMPLES   = FS * DURATION
GAIN        = 1000         # ADC units per mV  (PTB-XL default)
BASELINE    = 0            # PTB-XL baseline is 0

LEADS = ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"]
N_LEADS = len(LEADS)  # 12

random.seed(17)

# ── ECG morphology per lead ─────────────────────────────────────────────────
# Amplitudes (mV) — pathological values for heart disease patient
# I, II, III, aVR, aVL, aVF, V1..V6
P_AMP  = [0.08, 0.12, 0.06, -0.07, 0.05, 0.09, 0.03, 0.06, 0.09, 0.10, 0.10, 0.08]
Q_AMP  = [-0.03, -0.06, -0.04, 0.04, -0.02, -0.05, 0.0, -0.02, -0.04, -0.05, -0.04, -0.03]
R_AMP  = [0.60, 0.80, 0.40, -0.55, 0.35, 0.55, 0.18, 0.45, 0.90, 1.00, 0.85, 0.70]
S_AMP  = [-0.10, -0.15, -0.08, 0.12, -0.05, -0.12, -0.50, -0.35, -0.18, -0.10, -0.08, -0.06]
T_AMP  = [0.08, 0.08, 0.05, -0.07, 0.04, 0.07, -0.05, 0.06, 0.10, 0.10, 0.09, 0.08]
ST_DEP = [-0.06, -0.10, -0.05, 0.06, -0.04, -0.08, 0.03, -0.04, -0.08, -0.09, -0.08, -0.07]


def gaussian(t, center, width, amplitude):
    return amplitude * math.exp(-((t - center) ** 2) / (2 * width ** 2))


def synthesize_lead(lead_idx, n_samples, fs, hr_bpm=88):
    """Synthesize a single ECG lead signal."""
    rr_samp = int(fs * 60.0 / hr_bpm)

    # Timing (samples from beat onset)
    p_c  = int(0.09 * fs)
    q_c  = int(0.20 * fs)
    r_c  = int(0.24 * fs)
    s_c  = int(0.28 * fs)
    j_pt = int(0.30 * fs)
    t_c  = int(0.42 * fs)

    pw = 0.035 * fs
    qw = 0.012 * fs
    tw = 0.055 * fs

    beat = []
    for i in range(rr_samp):
        v = 0.0
        v += gaussian(i, p_c, pw, P_AMP[lead_idx])
        v += gaussian(i, q_c, qw, Q_AMP[lead_idx])
        v += gaussian(i, r_c, qw, R_AMP[lead_idx])
        v += gaussian(i, s_c, qw, S_AMP[lead_idx])
        if j_pt <= i <= t_c:
            frac = (i - j_pt) / max(1, t_c - j_pt)
            v += ST_DEP[lead_idx] * (1.0 - frac)
        v += gaussian(i, t_c, tw, T_AMP[lead_idx])
        beat.append(v)

    signal = []
    while len(signal) < n_samples:
        jitter = random.randint(-3, 3)
        b = beat[: rr_samp + jitter] if jitter > 0 else beat[:rr_samp]
        signal.extend(b)

    signal = signal[:n_samples]

    for i in range(n_samples):
        wander = 0.03 * math.sin(2 * math.pi * 0.05 * i / fs)
        noise  = random.gauss(0, 0.012)
        signal[i] += wander + noise

    return signal


def signal_to_adc(signal, gain, baseline):
    adc = []
    for v in signal:
        raw = int(round(v * gain + baseline))
        raw = max(-32768, min(32767, raw))
        adc.append(raw)
    return adc


def write_dat(all_adc, filepath):
    """
    Write WFDB format-16 multiplexed .dat file.
    Samples are interleaved: [lead0_s0, lead1_s0, ..., lead11_s0, lead0_s1, ...]
    """
    with open(filepath, "wb") as f:
        for sample_idx in range(N_SAMPLES):
            for lead_idx in range(N_LEADS):
                val = all_adc[lead_idx][sample_idx]
                f.write(struct.pack("<h", val))
    size = os.path.getsize(filepath)
    print(f"  Written: {filepath}  ({N_SAMPLES} samples x {N_LEADS} leads, {size} bytes)")


def write_hea(basename, filepath):
    """Write WFDB .hea header for 12-lead recording."""
    lines = [
        f"{basename} {N_LEADS} {FS} {N_SAMPLES}",
    ]
    for lead in LEADS:
        lines.append(
            f"{basename}.dat 16 {GAIN}({BASELINE}) 16 0 0 0 0 {lead}"
        )
    lines += [
        "# Patient: Synthetic HD patient — heart disease confirmed (target=1)",
        "# ECG model output probability: ~17%  (borderline / atypical)",
        "# Clinical: mild ST depression, flat T-wave, HR 88 bpm",
        "# Format: WFDB format-16, 12-lead, 500 Hz, 10 seconds (PTB-XL compatible)",
    ]
    with open(filepath, "w") as f:
        f.write("\n".join(lines) + "\n")
    print(f"  Written: {filepath}  ({N_LEADS} leads declared)")


# ── Main ────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    out_dir  = os.path.dirname(os.path.abspath(__file__))
    dat_path = os.path.join(out_dir, OUTPUT_NAME + ".dat")
    hea_path = os.path.join(out_dir, OUTPUT_NAME + ".hea")

    print("=" * 62)
    print("  Generating 12-lead WFDB ECG (PTB-XL compatible)")
    print(f"  Leads : {', '.join(LEADS)}")
    print(f"  Fs    : {FS} Hz | Duration: {DURATION}s | HR: 88 bpm")
    print(f"  Probe : Heart disease patient, ~17% model probability")
    print("=" * 62)

    print("\n[1/3] Synthesizing 12 ECG leads ...")
    all_adc = []
    for idx, lead_name in enumerate(LEADS):
        ecg_mv  = synthesize_lead(idx, N_SAMPLES, FS, hr_bpm=88)
        adc     = signal_to_adc(ecg_mv, GAIN, BASELINE)
        all_adc.append(adc)
        print(f"       {lead_name:4s}  peak={max(ecg_mv):.3f} mV  min={min(ecg_mv):.3f} mV")

    print("\n[2/3] Writing .dat (multiplexed 12-lead) ...")
    write_dat(all_adc, dat_path)

    print("\n[3/3] Writing .hea header ...")
    write_hea(OUTPUT_NAME, hea_path)

    print("\n[DONE] Files ready:")
    print(f"   {dat_path}")
    print(f"   {hea_path}")
    print("\nQuick read check with wfdb-python:")
    print(f"   import wfdb")
    print(f"   r = wfdb.rdrecord(r'{os.path.join(out_dir, OUTPUT_NAME)}')")
    print(f"   print(r.sig_name, r.p_signal.shape)  # 12 leads x 5000 samples")
