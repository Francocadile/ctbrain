import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import RoleGate from "@/components/auth/RoleGate";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CTExercisesPage() {
	const session = await getServerSession(authOptions);

	if (!session?.user?.id) {
		redirect("/login");
	}

	// Solo CT / ADMIN / SUPERADMIN pueden ver la biblioteca
	if (
		session.user.role !== "CT" &&
		session.user.role !== "ADMIN" &&
		session.user.role !== "SUPERADMIN"
	) {
		redirect("/");
	}

	return (
		<RoleGate allow={["CT", "ADMIN", "SUPERADMIN"]}>
			<main className="min-h-screen px-4 py-4 md:px-6 md:py-8">
				<div className="max-w-5xl mx-auto space-y-4">
					<header className="flex items-center justify-between gap-2">
						<div>
							<h1 className="text-lg md:text-xl font-bold text-gray-900">
								Biblioteca de Ejercicios
							</h1>
						</div>
					</header>

					<section className="mt-6 flex flex-col items-center justify-center gap-4 md:gap-6">
						<div className="grid w-full max-w-xl grid-cols-1 gap-4 md:grid-cols-2">
							<Link
								href="/ct/exercises/rutina"
								className="flex flex-col items-center justify-center rounded-xl border bg-white px-6 py-4 text-center text-lg font-semibold text-gray-800 shadow-sm hover:bg-gray-50 transition-colors"
							>
								<span>Rutinas / Gym</span>
								<span className="mt-1 text-xs font-normal text-gray-500">
									Ejercicios para rutinas y trabajo de fuerza.
								</span>
							</Link>
							<Link
								href="/ct/exercises/sesion"
								className="flex flex-col items-center justify-center rounded-xl border bg-white px-6 py-4 text-center text-lg font-semibold text-gray-800 shadow-sm hover:bg-gray-50 transition-colors"
							>
								<span>Sesiones / Campo</span>
								<span className="mt-1 text-xs font-normal text-gray-500">
									Ejercicios para sesiones y trabajos en campo.
								</span>
							</Link>
						</div>
					</section>
				</div>
			</main>
		</RoleGate>
	);
}

