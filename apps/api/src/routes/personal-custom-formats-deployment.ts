/**
 * Personal Custom Formats Deployment Routes
 *
 * Endpoints for deploying personal custom formats to instances and tracking deployments
 */

import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { z } from "zod";
import type {
	DeployMultiplePersonalCFsRequest,
	DeployPersonalCFResponse,
	PersonalCFDeployment,
} from "@arr/shared";
import type { CustomFormatSpecification } from "@arr/shared";
import { createArrApiClient } from "../lib/trash-guides/arr-api-client.js";
import { transformFieldsToArray } from "../lib/trash-guides/utils.js";

// ============================================================================
// Validation Schemas
// ============================================================================

const deployMultipleSchema = z.object({
	personalCFIds: z.array(z.string()).min(1, "At least one CF ID is required"),
	instanceId: z.string().min(1, "instanceId is required"),
});

// ============================================================================
// Route Handlers
// ============================================================================

export async function registerPersonalCFDeploymentRoutes(
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
	 * POST /api/personal-custom-formats/deploy-multiple
	 * Deploy multiple personal custom formats to an instance
	 */
	app.post<{
		Body: DeployMultiplePersonalCFsRequest;
	}>("/deploy-multiple", async (request, reply) => {
		// Validate request body
		const bodyResult = deployMultipleSchema.safeParse(request.body);
		if (!bodyResult.success) {
			return reply.status(400).send({
				error: "VALIDATION_ERROR",
				message: "Invalid request body",
				details: bodyResult.error.errors,
			});
		}

		const { personalCFIds, instanceId } = bodyResult.data;
		const userId = request.currentUser!.id;

		try {
			// Get instance - verify ownership
			const instance = await app.prisma.serviceInstance.findFirst({
				where: {
					id: instanceId,
					userId,
				},
			});

			if (!instance) {
				return reply.status(404).send({
					error: "NOT_FOUND",
					message: "Instance not found",
				});
			}

			// Get personal CFs - verify ownership
			const personalCFs = await app.prisma.personalCustomFormat.findMany({
				where: {
					id: { in: personalCFIds },
					userId,
					deletedAt: null,
				},
			});

			if (personalCFs.length !== personalCFIds.length) {
				return reply.status(404).send({
					error: "SOME_CFS_NOT_FOUND",
					message: "Some custom formats were not found",
				});
			}

			// Verify all CFs match instance service type
			const mismatch = personalCFs.find((cf) => cf.serviceType !== instance.service);
			if (mismatch) {
				return reply.status(400).send({
					error: "SERVICE_MISMATCH",
					message: `CF "${mismatch.name}" is for ${mismatch.serviceType}, instance is ${instance.service}`,
				});
			}

			// Create ARR API client
			const arrClient = createArrApiClient(instance, app.encryptor);

			// Get existing CFs from instance
			const existingFormats = await arrClient.getCustomFormats();
			const existingByName = new Map(existingFormats.map((cf) => [cf.name, cf]));

			const results = {
				created: [] as string[],
				updated: [] as string[],
				failed: [] as Array<{ name: string; error: string }>,
			};

			for (const personalCF of personalCFs) {
				try {
					const specifications = JSON.parse(personalCF.specifications);
					const existing = existingByName.get(personalCF.name);

					// Transform specifications: convert fields from object → array format
					const transformedSpecs = specifications.map((spec: CustomFormatSpecification) => ({
						...spec,
						fields: transformFieldsToArray(spec.fields),
					}));

					let instanceCFId: number;

					if (existing?.id) {
						// Update existing CF
						const updated = await arrClient.updateCustomFormat(existing.id, {
							...existing,
							name: personalCF.name,
							includeCustomFormatWhenRenaming: personalCF.includeCustomFormatWhenRenaming,
							specifications: transformedSpecs as unknown as CustomFormatSpecification[],
						});
						instanceCFId = updated.id!;
						results.updated.push(personalCF.name);
					} else {
						// Create new CF
						const created = await arrClient.createCustomFormat({
							name: personalCF.name,
							includeCustomFormatWhenRenaming: personalCF.includeCustomFormatWhenRenaming,
							specifications: transformedSpecs as unknown as CustomFormatSpecification[],
						});
						instanceCFId = created.id!;
						results.created.push(personalCF.name);
					}

					// Record deployment
					await app.prisma.personalCFDeployment.upsert({
						where: {
							instanceId_personalCFId: {
								instanceId,
								personalCFId: personalCF.id,
							},
						},
						update: {
							instanceCFId,
							deployedVersion: personalCF.version,
							deployedSpecsSnapshot: personalCF.specifications,
							deployedAt: new Date(),
						},
						create: {
							userId,
							personalCFId: personalCF.id,
							instanceId,
							instanceCFId,
							deployedVersion: personalCF.version,
							deployedSpecsSnapshot: personalCF.specifications,
						},
					});
				} catch (error) {
					results.failed.push({
						name: personalCF.name,
						error: error instanceof Error ? error.message : "Unknown error",
					});
				}
			}

			const success = results.failed.length === 0;

			const response: DeployPersonalCFResponse = {
				success,
				created: results.created,
				updated: results.updated,
				failed: results.failed,
			};

			if (success) {
				return reply.send(response);
			}
			return reply.status(400).send(response);
		} catch (error) {
			app.log.error(
				{ err: error, personalCFIds, instanceId, userId },
				"Failed to deploy personal custom formats",
			);
			return reply.status(500).send({
				error: "DEPLOYMENT_FAILED",
				message: error instanceof Error ? error.message : "Failed to deploy custom formats",
			});
		}
	});

	/**
	 * GET /api/personal-custom-formats/deployments
	 * List all personal CF deployments
	 */
	app.get<{
		Querystring: {
			instanceId?: string;
		};
	}>("/deployments", async (request, reply) => {
		const userId = request.currentUser!.id;
		const { instanceId } = request.query;

		try {
			const where: {
				userId: string;
				instanceId?: string;
			} = { userId };

			if (instanceId) {
				where.instanceId = instanceId;
			}

			const deployments = await app.prisma.personalCFDeployment.findMany({
				where,
				include: {
					personalCF: true,
					instance: {
						select: {
							label: true,
							service: true,
						},
					},
				},
				orderBy: [{ instanceId: "asc" }, { deployedAt: "desc" }],
			});

			const formattedDeployments: PersonalCFDeployment[] = deployments.map((d) => ({
				id: d.id,
				personalCFId: d.personalCFId,
				personalCFName: d.personalCF.name,
				instanceId: d.instanceId,
				instanceLabel: d.instance.label,
				instanceCFId: d.instanceCFId,
				deployedVersion: d.deployedVersion,
				currentVersion: d.personalCF.version,
				needsUpdate: d.personalCF.version > d.deployedVersion,
				deployedAt: d.deployedAt.toISOString(),
			}));

			return reply.send({
				success: true,
				deployments: formattedDeployments,
			});
		} catch (error) {
			app.log.error({ err: error, userId, instanceId }, "Failed to list deployments");
			return reply.status(500).send({
				error: "LIST_FAILED",
				message: error instanceof Error ? error.message : "Failed to list deployments",
			});
		}
	});

	/**
	 * GET /api/personal-custom-formats/updates
	 * Check for personal CFs with version drift (deployed version < current version)
	 */
	app.get<{
		Querystring: {
			instanceId?: string;
			serviceType?: "RADARR" | "SONARR";
		};
	}>("/updates", async (request, reply) => {
		const userId = request.currentUser!.id;
		const { instanceId, serviceType } = request.query;

		try {
			const where: {
				userId: string;
				instanceId?: string;
			} = { userId };

			if (instanceId) {
				where.instanceId = instanceId;
			}

			const deployments = await app.prisma.personalCFDeployment.findMany({
				where,
				include: {
					personalCF: true,
					instance: {
						select: {
							label: true,
							service: true,
						},
					},
				},
			});

			// Filter by service type and version drift
			const updates = deployments
				.filter((d) => {
					if (serviceType && d.personalCF.serviceType !== serviceType) return false;
					return d.personalCF.version > d.deployedVersion;
				})
				.map((d) => ({
					deploymentId: d.id,
					personalCFId: d.personalCFId,
					personalCFName: d.personalCF.name,
					instanceId: d.instanceId,
					instanceLabel: d.instance.label,
					serviceType: d.personalCF.serviceType,
					deployedVersion: d.deployedVersion,
					currentVersion: d.personalCF.version,
				}));

			return reply.send({
				success: true,
				hasUpdates: updates.length > 0,
				updates,
				totalDeployed: deployments.length,
				outdatedCount: updates.length,
			});
		} catch (error) {
			app.log.error({ err: error, userId, instanceId, serviceType }, "Failed to check updates");
			return reply.status(500).send({
				error: "CHECK_FAILED",
				message: error instanceof Error ? error.message : "Failed to check for updates",
			});
		}
	});

	/**
	 * DELETE /api/personal-custom-formats/deployments/:id
	 * Remove deployment tracking record (does NOT remove CF from instance)
	 */
	app.delete<{
		Params: { id: string };
	}>("/deployments/:id", async (request, reply) => {
		const userId = request.currentUser!.id;
		const { id } = request.params;

		try {
			// Verify ownership
			const deployment = await app.prisma.personalCFDeployment.findFirst({
				where: { id, userId },
				include: { personalCF: true },
			});

			if (!deployment) {
				return reply.status(404).send({
					error: "NOT_FOUND",
					message: "Deployment record not found",
				});
			}

			await app.prisma.personalCFDeployment.delete({
				where: { id },
			});

			return reply.send({
				success: true,
				message: `Stopped tracking deployment of "${deployment.personalCF.name}"`,
			});
		} catch (error) {
			app.log.error({ err: error, id }, "Failed to delete deployment record");
			return reply.status(500).send({
				error: "DELETE_FAILED",
				message: error instanceof Error ? error.message : "Failed to delete deployment record",
			});
		}
	});
}
