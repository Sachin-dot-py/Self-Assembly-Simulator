import argparse
import os

# Redirect all cache/config writes to a writable directory
os.environ.setdefault("HOME", "/app/api/temp")
os.environ["HF_HOME"] = "/app/api/temp/.cache/huggingface"
os.environ["TORCH_HOME"] = "/app/api/temp/.cache/torch"
os.environ["MPLCONFIGDIR"] = "/app/api/temp/.cache/matplotlib"
os.environ["XDG_CACHE_HOME"] = "/app/api/temp/.cache"

import numpy as np
import torch
import csv
import time

from huggingface_hub import login
from TOKEN import HUGGING_FACE_TOKEN
login(token=HUGGING_FACE_TOKEN)

from ase.io import read, write
from ase import units
from ase.md.velocitydistribution import MaxwellBoltzmannDistribution
from ase.md.langevin import Langevin
from ase.md.nptberendsen import NPTBerendsen
from ase.io.trajectory import Trajectory

from fairchem.core import pretrained_mlip, FAIRChemCalculator


# ------------------------
# Arguments
# ------------------------

parser = argparse.ArgumentParser()
parser.add_argument("structure", help="Input CIF / POSCAR / XYZ")
parser.add_argument("--task", default="omol", help="UMA task (default: omol)")
parser.add_argument("--outdir", default=".", help="Output directory")
parser.add_argument("--slack", type=float, default=2.0, help="Padding for XYZ box (Å)")
parser.add_argument("--xyz_no_pbc", action="store_true",
                    help="If input is XYZ, disable periodic boundary conditions (default: use PBC)")
parser.add_argument("--pressure", type=float, default=1.0, help="Target pressure (atm)")
parser.add_argument("--thermo_interval", type=int, default=10, help="Thermo output interval (MD steps)")
args = parser.parse_args()

os.makedirs(args.outdir, exist_ok=True)


# ------------------------
# Load structure
# ------------------------

atoms = read(args.structure)
ext = os.path.splitext(args.structure)[1].lower()


# ------------------------
# Handle XYZ input + PBC choice
# ------------------------

use_pbc = True

if ext == ".xyz":

    use_pbc = (not args.xyz_no_pbc)

    if use_pbc:
        print("XYZ detected — generating periodic box (PBC enabled)")

        pos = atoms.positions
        mins = pos.min(axis=0)
        maxs = pos.max(axis=0)

        lengths = (maxs - mins) + 2.0 * args.slack
        cell = np.diag(lengths)

        atoms.positions -= mins
        atoms.positions += args.slack

        atoms.set_cell(cell)

        out_cif = os.path.join(args.outdir, "generated_from_xyz.cif")
        write(out_cif, atoms)

        print("Generated CIF:", out_cif)

    else:
        print("XYZ detected — PBC disabled (no box will be generated)")
        # Keep coordinates as-is; ASE XYZ typically has no cell and no PBC.


# ------------------------
# Boundary conditions and UMA requirements
# ------------------------

atoms.pbc = [use_pbc, use_pbc, use_pbc]
atoms.info["charge"] = atoms.info.get("charge", 0)
atoms.info["spin"] = atoms.info.get("spin", 1)


# ------------------------
# Build UMA calculator
# ------------------------

device = "cuda" if torch.cuda.is_available() else "cpu"
print("Using device:", device)

predictor = pretrained_mlip.get_predict_unit("uma-s-1p1", device=device)
calc = FAIRChemCalculator(predictor, task_name=args.task)

atoms.calc = calc


# ------------------------
# Initialize velocities
# ------------------------

MaxwellBoltzmannDistribution(atoms, temperature_K=1.0)


# ------------------------
# MD parameters (OPTIMIZED)
# ------------------------

dt = 2.0 * units.fs
friction = 0.001 / units.fs

pressure_au = args.pressure * 1.01325 * units.bar

taut = 100 * units.fs
taup = 500 * units.fs

compressibility = 4.5e-5


# ------------------------
# Thermo logging setup
# ------------------------

thermo_path = os.path.join(args.outdir, "thermo.csv")

thermo_file = open(thermo_path, "w", newline="")
thermo_writer = csv.writer(thermo_file)

thermo_writer.writerow([
    "md_step",
    "time_ps",
    "phase",
    "ensemble",
    "temperature_K",
    "potential_energy_eV",
    "kinetic_energy_eV",
    "total_energy_eV",
    "volume_A3",
    "density_g_cm3",
    "pressure_bar",
    "walltime_per_step_ms",
])


# ------------------------
# Globals for logging
# ------------------------

md_step = 0
current_phase = "init"
current_ensemble = "NA"

last_walltime = None
last_step_time_ms = 0.0

traj_files_created = []


# ------------------------
# Console header
# ------------------------

print(
    "\nStep   Time(ps)  Phase              Ens  Temp(K)    Epot(eV)     Ekin(eV)     Etot(eV)    Vol(A3)  Density(g/cm3)  P(bar)  StepTime(ms)"
)
print("-" * 145)


# ------------------------
# Per-step timer callback
# ------------------------

def step_timer():
    global md_step, last_walltime, last_step_time_ms

    md_step += 1

    now = time.perf_counter()
    if last_walltime is not None:
        last_step_time_ms = (now - last_walltime) * 1000.0
    last_walltime = now


# ------------------------
# Thermo logger callback
# ------------------------

def _safe_float(x):
    try:
        return float(x)
    except Exception:
        return np.nan


def log_thermo():
    temp = atoms.get_temperature()
    epot = atoms.get_potential_energy()
    ekin = atoms.get_kinetic_energy()
    etot = epot + ekin

    if use_pbc:
        volume = atoms.get_volume()
        if volume > 0:
            mass = atoms.get_masses().sum()
            density = (mass / volume) * 1.66054
        else:
            density = np.nan

        try:
            pressure = atoms.get_pressure() / units.bar
        except Exception:
            pressure = np.nan
    else:
        volume = np.nan
        density = np.nan
        pressure = np.nan

    time_ps = (md_step * dt / units.fs) / 1000.0

    thermo_writer.writerow([
        md_step,
        f"{time_ps:.6f}",
        current_phase,
        current_ensemble,
        f"{temp:.3f}",
        f"{epot:.6f}",
        f"{ekin:.6f}",
        f"{etot:.6f}",
        "" if np.isnan(volume) else f"{volume:.3f}",
        "" if np.isnan(density) else f"{density:.6f}",
        "" if np.isnan(pressure) else f"{pressure:.3f}",
        f"{last_step_time_ms:.3f}",
    ])
    thermo_file.flush()

    # Console output
    phase_short = (current_phase[:16] + "..") if len(current_phase) > 18 else current_phase
    ens_short = current_ensemble[:3]
    print(
        f"{md_step:6d} "
        f"{time_ps:9.4f} "
        f"{phase_short:18s} "
        f"{ens_short:3s} "
        f"{temp:8.2f} "
        f"{epot:11.4f} "
        f"{ekin:11.4f} "
        f"{etot:11.4f} "
        f"{(0.0 if np.isnan(volume) else volume):9.2f} "
        f"{(0.0 if np.isnan(density) else density):13.6f} "
        f"{(0.0 if np.isnan(pressure) else pressure):7.2f} "
        f"{last_step_time_ms:10.2f}"
    )


# ------------------------
# MD runner
# ------------------------

def run_md(tempK, steps, name, ensemble):
    """Run a single MD phase.

    If use_pbc is False, any request for NPT is automatically downgraded to NVT,
    because barostats require a periodic cell.
    """

    global current_phase, current_ensemble, last_walltime

    current_phase = name

    if (ensemble.upper() == "NPT") and (not use_pbc):
        print(f"\n{name}: Requested NPT but PBC is disabled; running NVT instead.")
        ensemble = "NVT"

    current_ensemble = ensemble.upper()

    # Reset walltime baseline so first step in a phase does not inherit prior phase timing.
    last_walltime = None

    if current_ensemble == "NVT":
        dyn = Langevin(
            atoms,
            timestep=dt,
            temperature_K=tempK,
            friction=friction,
        )
    elif current_ensemble == "NPT":
        dyn = NPTBerendsen(
            atoms,
            timestep=dt,
            temperature_K=tempK,
            pressure_au=pressure_au,
            taut=taut,
            taup=taup,
            compressibility=compressibility,
        )
    else:
        raise ValueError(f"Unknown ensemble: {ensemble}")

    traj_path = os.path.join(args.outdir, f"{name}.traj")
    traj = Trajectory(traj_path, "w", atoms)
    traj_files_created.append(traj_path)

    dyn.attach(step_timer, interval=1)
    dyn.attach(traj.write, interval=500)
    dyn.attach(log_thermo, interval=args.thermo_interval)

    dyn.run(steps)

    # Always write the final configuration of the phase.
    traj.write(atoms)
    traj.close()


# ------------------------
# Post-processing: combine trajectories
# ------------------------

def combine_trajectories(outdir, traj_files, out_name="trajectory_all.traj"):
    combined_path = os.path.join(outdir, out_name)

    combined = Trajectory(combined_path, "w")
    n_written = 0

    for tf in traj_files:
        if not os.path.exists(tf):
            continue
        try:
            t = Trajectory(tf, "r")
            for a in t:
                combined.write(a)
                n_written += 1
            t.close()
        except Exception as e:
            print(f"Warning: could not read trajectory {tf}: {e}")

    combined.close()

    # Also write an XYZ for convenience (optional)
    xyz_path = os.path.join(outdir, "trajectory_all.xyz")
    try:
        # Re-read combined for XYZ output
        t = Trajectory(combined_path, "r")
        first = True
        for a in t:
            write(xyz_path, a, append=(not first))
            first = False
        t.close()
    except Exception as e:
        print(f"Warning: could not write combined XYZ: {e}")
        xyz_path = None

    return combined_path, xyz_path, n_written


# ------------------------
# Post-processing: plot thermo data by phase
# ------------------------

def plot_thermo(thermo_csv_path, outdir):
    try:
        import matplotlib.pyplot as plt
    except Exception as e:
        print(f"Matplotlib not available; skipping plots: {e}")
        return None

    rows = []
    with open(thermo_csv_path, "r", newline="") as f:
        reader = csv.DictReader(f)
        for r in reader:
            rows.append(r)

    if len(rows) == 0:
        print("No thermo data found; skipping plots.")
        return None

    def fnum(s):
        try:
            return float(s)
        except Exception:
            return np.nan

    # Preserve phase order as encountered
    phase_order = []
    for r in rows:
        ph = r.get("phase", "unknown")
        if ph not in phase_order:
            phase_order.append(ph)

    # Build arrays
    t = np.array([fnum(r.get("time_ps", "")) for r in rows], dtype=float)
    T = np.array([fnum(r.get("temperature_K", "")) for r in rows], dtype=float)
    Epot = np.array([fnum(r.get("potential_energy_eV", "")) for r in rows], dtype=float)
    Ekin = np.array([fnum(r.get("kinetic_energy_eV", "")) for r in rows], dtype=float)
    Etot = np.array([fnum(r.get("total_energy_eV", "")) for r in rows], dtype=float)
    P = np.array([fnum(r.get("pressure_bar", "")) for r in rows], dtype=float)
    rho = np.array([fnum(r.get("density_g_cm3", "")) for r in rows], dtype=float)

    phases = [r.get("phase", "unknown") for r in rows]

    fig, axes = plt.subplots(2, 3, figsize=(15, 8), sharex=True)
    axes = axes.ravel()

    specs = [
        ("Total energy (eV)", Etot),
        ("Potential energy (eV)", Epot),
        ("Kinetic energy (eV)", Ekin),
        ("Temperature (K)", T),
        ("Pressure (bar)", P),
        ("Density (g/cm³)", rho),
    ]

    for ax_i, (ylabel, y) in enumerate(specs):
        ax = axes[ax_i]

        if (not use_pbc) and (ylabel.startswith("Pressure") or ylabel.startswith("Density")):
            ax.text(0.5, 0.5, "No PBC: undefined", ha="center", va="center", transform=ax.transAxes)
            ax.set_axis_off()
            continue

        for pi, ph in enumerate(phase_order):
            idx = [i for i, p in enumerate(phases) if p == ph]
            if len(idx) == 0:
                continue

            tt = t[idx]
            yy = y[idx]

            # Label only once for a shared legend.
            label = ph if ax_i == 0 else "_nolegend_"
            ax.plot(tt, yy, label=label)

        ax.set_ylabel(ylabel)
        ax.grid(True, alpha=0.3)

    for ax in axes[-3:]:
        ax.set_xlabel("Simulation time (ps)")

    handles, labels = axes[0].get_legend_handles_labels()
    if len(handles) > 0:
        fig.legend(handles, labels, loc="center right", title="Phase")

    fig.suptitle("Thermodynamics vs time (color-coded by phase)")
    fig.tight_layout(rect=[0, 0, 0.86, 0.95])

    fig_path = os.path.join(outdir, "thermo_plots.png")
    fig.savefig(fig_path, dpi=200)
    plt.close(fig)

    return fig_path


# ------------------------
# FAST UMA equilibration protocol
# ------------------------

print("\nNPT heating: 1 → 298 K")
run_md(298, 200, "heat1", "NPT")

print("\nNPT equilibration: 298 K")
run_md(298, 300, "equilibrate1", "NPT")

print("\nNPT heating: 298 → 1000 K")
run_md(1000, 200, "heat2", "NPT")

print("\nNPT equilibration: 1000 K")
run_md(1000, 300, "equilibrate2", "NPT")

print("\nNPT cooling: 1000 → 298 K")
run_md(298, 200, "cool", "NPT")

print("\nFinal NVT equilibration")
run_md(298, 300, "final_equilibrate", "NVT")


# ------------------------
# Finalize + post-process
# ------------------------

thermo_file.close()

combined_traj, combined_xyz, nframes = combine_trajectories(args.outdir, traj_files_created)
print(f"\nCombined trajectory written: {combined_traj} (frames: {nframes})")
if combined_xyz is not None:
    print(f"Combined XYZ written: {combined_xyz}")

fig_path = plot_thermo(thermo_path, args.outdir)
if fig_path is not None:
    print(f"Thermo plots written: {fig_path}")

print("\nSimulation finished")
