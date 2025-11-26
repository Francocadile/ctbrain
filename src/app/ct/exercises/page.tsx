import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import RoleGate from "@/components/auth/RoleGate";
import ExercisesLibraryClient from "./ExercisesLibraryClient";

export const dynamic = "force-dynamic";

async function getExercisesForLibrary() {
	const raw = await prisma.exercise.findMany({
		orderBy: { name: "asc" },
	});

	return raw.map((e: any) => ({
		id: e.id,
		name: e.name,
		zone: e.zone,
		videoUrl: e.videoUrl,
		isTeamExercise: e.teamId != null,
		usage: e.usage,
		createdAt: e.createdAt.toISOString(),
	}));
}

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

	const exercises = await getExercisesForLibrary();

	return (
		<RoleGate allow={["CT", "ADMIN", "SUPERADMIN"]}>
			<main className="min-h-screen px-4 py-4 md:px-6 md:py-8">
				<div className="max-w-5xl mx-auto space-y-4">
					<header className="flex items-center justify-between gap-2">
						<div>
							<h1 className="text-lg md:text-xl font-bold text-gray-900">
								Biblioteca de ejercicios
							</h1>
							<p className="text-xs md:text-sm text-gray-600">
								Busca, filtra y visualiza los ejercicios disponibles para armar tus rutinas.
							</p>
						</div>
					</header>

					<ExercisesLibraryClient exercises={exercises} />
				</div>
			</main>
		</RoleGate>
	);
}

