"""
Legacy FastAI training stack (learner, metrics, dataset wiring).

That stack is intentionally **not** bundled in this service: inference uses
`ECG.Skeleton.xresnet1d` together with `app.services.ecg_service.ECGPredictor`.

For the original training code, see the PTB-XL benchmarking repository
(for example `helme/ecg_ptbxl_benchmarking` on GitHub).
"""
