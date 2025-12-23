/**
 * Personal Custom Formats CRUD Routes
 *
 * Endpoints for creating, reading, updating, and deleting user-created custom formats
 */

import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { z } from "zod";
import type {
	CreatePersonalCFRequest,
	UpdatePersonalCFRequest,
	PersonalCustomFormat,
} from "@arr/shared";

// ============================================================================
// Validation Schemas
// ============================================================================

const specificationSchema = z.object({
	name: z.string(),
	implementation: z.string(),
	negate: z.boolean(),
	required: z.boolean(),
	fields: z.record(z.unknown()),
});

const createPersonalCFSchema = z.object({
	name: z.string().min(1).max(100),
	serviceType: z.enum(["RADARR", "SONARR"]),
	includeCustomFormatWhenRenaming: z.boolean().optional(),
	specifications: z.array(specificationSchema).min(1, "At least one specification is required"),
});

const updatePersonalCFSchema = z.object({
	name: z.string().min(1).max(100).optional(),
	includeCustomFormatWhenRenaming: z.boolean().optional(),
	specifications: z.array(specificationSchema).min(1).optional(),
});

// ============================================================================
// Route Handlers
// ============================================================================

export async function registerPersonalCFRoutes(
	app: FastifyInstance,
	_opts: FastifyPluginOptions,
) {
	// Add authentication preHandler for all routes in this plugin
	app.addHook("preHandler", async (request, reply) => {
		if (!request.currentUser?.id) {
			return reply.status(401).send({
				error: "UNAUTHORIZED",
				message: "Authentication required",
			});
		}
	});

	/**
	 * GET /api/personal-custom-formats
	 * List all personal custom formats for the current user
	 */
	app.get<{
		Querystring: { serviceType?: "RADARR" | "SONARR" };
	}>("/", async (request, reply) => {
		const { serviceType } = request.query;
		const userId = request.currentUser!.id;

		try {
			const where: {
				userId: string;
				deletedAt: null;
				serviceType?: "RADARR" | "SONARR";
			} = {
				userId,
				deletedAt: null,
			};

			if (serviceType) {
				where.serviceType = serviceType;
			}

			const customFormats = await app.prisma.personalCustomFormat.findMany({
				where,
				orderBy: [{ serviceType: "asc" }, { name: "asc" }],
			});

			// Parse specifications JSON for each custom format
			const formattedCustomFormats: PersonalCustomFormat[] = customFormats.map((cf) => ({
				id: cf.id,
				userId: cf.userId,
				name: cf.name,
				serviceType: cf.serviceType,
				includeCustomFormatWhenRenaming: cf.includeCustomFormatWhenRenaming,
				specifications: JSON.parse(cf.specifications),
				version: cf.version,
				createdAt: cf.createdAt.toISOString(),
				updatedAt: cf.updatedAt.toISOString(),
				deletedAt: cf.deletedAt?.toISOString(),
			}));

			return reply.send({
				success: true,
				customFormats: formattedCustomFormats,
			});
		} catch (error) {
			app.log.error({ err: error, userId, serviceType }, "Failed to fetch personal custom formats");
			return reply.status(500).send({
				error: "FETCH_FAILED",
				message: error instanceof Error ? error.message : "Failed to fetch custom formats",
			});
		}
	});

	/**
	 * GET /api/personal-custom-formats/:id
	 * Get a single personal custom format by ID
	 */
	app.get<{
		Params: { id: string };
	}>("/:id", async (request, reply) => {
		const { id } = request.params;
		const userId = request.currentUser!.id;

		try {
			const cf = await app.prisma.personalCustomFormat.findFirst({
				where: {
					id,
					userId,
					deletedAt: null,
				},
			});

			if (!cf) {
				return reply.status(404).send({
					error: "NOT_FOUND",
					message: "Custom format not found or access denied",
				});
			}

			const formattedCF: PersonalCustomFormat = {
				id: cf.id,
				userId: cf.userId,
				name: cf.name,
				serviceType: cf.serviceType,
				includeCustomFormatWhenRenaming: cf.includeCustomFormatWhenRenaming,
				specifications: JSON.parse(cf.specifications),
				version: cf.version,
				createdAt: cf.createdAt.toISOString(),
				updatedAt: cf.updatedAt.toISOString(),
				deletedAt: cf.deletedAt?.toISOString(),
			};

			return reply.send({
				success: true,
				customFormat: formattedCF,
			});
		} catch (error) {
			app.log.error({ err: error, id, userId }, "Failed to fetch personal custom format");
			return reply.status(500).send({
				error: "FETCH_FAILED",
				message: error instanceof Error ? error.message : "Failed to fetch custom format",
			});
		}
	});

	/**
	 * POST /api/personal-custom-formats
	 * Create a new personal custom format
	 */
	app.post<{
		Body: CreatePersonalCFRequest;
	}>("/", async (request, reply) => {
		const bodyResult = createPersonalCFSchema.safeParse(request.body);
		if (!bodyResult.success) {
			return reply.status(400).send({
				error: "VALIDATION_ERROR",
				message: "Invalid request body",
				details: bodyResult.error.errors,
			});
		}

		const { name, serviceType, includeCustomFormatWhenRenaming, specifications } =
			bodyResult.data;
		const userId = request.currentUser!.id;

		try {
			// Check for duplicate name
			const existing = await app.prisma.personalCustomFormat.findFirst({
				where: {
					userId,
					name,
					serviceType,
					deletedAt: null,
				},
			});

			if (existing) {
				return reply.status(409).send({
					error: "DUPLICATE_NAME",
					message: `A custom format named "${name}" already exists for ${serviceType}`,
				});
			}

			// Create the custom format
			const cf = await app.prisma.personalCustomFormat.create({
				data: {
					userId,
					name,
					serviceType,
					includeCustomFormatWhenRenaming: includeCustomFormatWhenRenaming ?? false,
					specifications: JSON.stringify(specifications),
					version: 1,
				},
			});

			const formattedCF: PersonalCustomFormat = {
				id: cf.id,
				userId: cf.userId,
				name: cf.name,
				serviceType: cf.serviceType,
				includeCustomFormatWhenRenaming: cf.includeCustomFormatWhenRenaming,
				specifications: JSON.parse(cf.specifications),
				version: cf.version,
				createdAt: cf.createdAt.toISOString(),
				updatedAt: cf.updatedAt.toISOString(),
				deletedAt: cf.deletedAt?.toISOString(),
			};

			return reply.status(201).send({
				success: true,
				customFormat: formattedCF,
			});
		} catch (error) {
			app.log.error({ err: error, name, serviceType, userId }, "Failed to create personal custom format");
			return reply.status(500).send({
				error: "CREATE_FAILED",
				message: error instanceof Error ? error.message : "Failed to create custom format",
			});
		}
	});

	/**
	 * PUT /api/personal-custom-formats/:id
	 * Update an existing personal custom format
	 */
	app.put<{
		Params: { id: string };
		Body: UpdatePersonalCFRequest;
	}>("/:id", async (request, reply) => {
		const { id } = request.params;
		const userId = request.currentUser!.id;

		// Validate request body
		const bodyResult = updatePersonalCFSchema.safeParse(request.body);
		if (!bodyResult.success) {
			return reply.status(400).send({
				error: "VALIDATION_ERROR",
				message: "Invalid request body",
				details: bodyResult.error.errors,
			});
		}

		const { name, includeCustomFormatWhenRenaming, specifications } = bodyResult.data;

		try {
			// Verify ownership
			const cf = await app.prisma.personalCustomFormat.findFirst({
				where: {
					id,
					userId,
					deletedAt: null,
				},
			});

			if (!cf) {
				return reply.status(404).send({
					error: "NOT_FOUND",
					message: "Custom format not found or access denied",
				});
			}

			// Check for duplicate name if name is changing
			if (name && name !== cf.name) {
				const existing = await app.prisma.personalCustomFormat.findFirst({
					where: {
						userId,
						name,
						serviceType: cf.serviceType,
						deletedAt: null,
					},
				});

				if (existing) {
					return reply.status(409).send({
						error: "DUPLICATE_NAME",
						message: `A custom format named "${name}" already exists for ${cf.serviceType}`,
					});
				}
			}

			// Increment version when specifications change
			const newVersion = specifications ? cf.version + 1 : cf.version;

			// Update the custom format
			const updated = await app.prisma.personalCustomFormat.update({
				where: { id },
				data: {
					...(name && { name }),
					...(includeCustomFormatWhenRenaming !== undefined && {
						includeCustomFormatWhenRenaming,
					}),
					...(specifications && { specifications: JSON.stringify(specifications) }),
					version: newVersion,
				},
			});

			const formattedCF: PersonalCustomFormat = {
				id: updated.id,
				userId: updated.userId,
				name: updated.name,
				serviceType: updated.serviceType,
				includeCustomFormatWhenRenaming: updated.includeCustomFormatWhenRenaming,
				specifications: JSON.parse(updated.specifications),
				version: updated.version,
				createdAt: updated.createdAt.toISOString(),
				updatedAt: updated.updatedAt.toISOString(),
				deletedAt: updated.deletedAt?.toISOString(),
			};

			return reply.send({
				success: true,
				customFormat: formattedCF,
			});
		} catch (error) {
			app.log.error({ err: error, id, userId }, "Failed to update personal custom format");
			return reply.status(500).send({
				error: "UPDATE_FAILED",
				message: error instanceof Error ? error.message : "Failed to update custom format",
			});
		}
	});

	/**
	 * DELETE /api/personal-custom-formats/:id
	 * Soft delete a personal custom format
	 */
	app.delete<{
		Params: { id: string };
	}>("/:id", async (request, reply) => {
		const { id } = request.params;
		const userId = request.currentUser!.id;

		try {
			// Verify ownership
			const cf = await app.prisma.personalCustomFormat.findFirst({
				where: {
					id,
					userId,
					deletedAt: null,
				},
			});

			if (!cf) {
				return reply.status(404).send({
					error: "NOT_FOUND",
					message: "Custom format not found or access denied",
				});
			}

			// Soft delete (set deletedAt timestamp)
			await app.prisma.personalCustomFormat.update({
				where: { id },
				data: {
					deletedAt: new Date(),
				},
			});

			return reply.send({
				success: true,
				message: `Deleted custom format "${cf.name}"`,
			});
		} catch (error) {
			app.log.error({ err: error, id, userId }, "Failed to delete personal custom format");
			return reply.status(500).send({
				error: "DELETE_FAILED",
				message: error instanceof Error ? error.message : "Failed to delete custom format",
			});
		}
	});
}
