import type {
	PersonalCustomFormat,
	CreatePersonalCFRequest,
	UpdatePersonalCFRequest,
	PersonalCFResponse,
	PersonalCFListResponse,
	DeployMultiplePersonalCFsRequest,
	DeployPersonalCFResponse,
	PersonalCFDeploymentsResponse,
	PersonalCFUpdatesResponse,
} from "@arr/shared";
import { apiRequest } from "./base";

// ============================================================================
// Personal Custom Format CRUD Operations
// ============================================================================

/**
 * Fetch all personal custom formats for the current user
 */
export async function fetchPersonalCustomFormats(
	serviceType?: "RADARR" | "SONARR",
): Promise<PersonalCFListResponse> {
	const url = serviceType
		? `/api/personal-custom-formats?serviceType=${serviceType}`
		: "/api/personal-custom-formats";

	return await apiRequest<PersonalCFListResponse>(url);
}

/**
 * Fetch a single personal custom format by ID
 */
export async function fetchPersonalCustomFormat(id: string): Promise<PersonalCFResponse> {
	return await apiRequest<PersonalCFResponse>(`/api/personal-custom-formats/${id}`);
}

/**
 * Create a new personal custom format
 */
export async function createPersonalCustomFormat(
	payload: CreatePersonalCFRequest,
): Promise<PersonalCFResponse> {
	return await apiRequest<PersonalCFResponse>("/api/personal-custom-formats", {
		method: "POST",
		json: payload,
	});
}

/**
 * Update an existing personal custom format
 */
export async function updatePersonalCustomFormat(
	id: string,
	payload: UpdatePersonalCFRequest,
): Promise<PersonalCFResponse> {
	return await apiRequest<PersonalCFResponse>(`/api/personal-custom-formats/${id}`, {
		method: "PUT",
		json: payload,
	});
}

/**
 * Delete a personal custom format (soft delete)
 */
export async function deletePersonalCustomFormat(
	id: string,
): Promise<{ success: boolean; message: string }> {
	return await apiRequest<{ success: boolean; message: string }>(
		`/api/personal-custom-formats/${id}`,
		{
			method: "DELETE",
		},
	);
}

// ============================================================================
// Personal Custom Format Deployment Operations
// ============================================================================

/**
 * Deploy multiple personal custom formats to an instance
 */
export async function deployMultiplePersonalCFs(
	payload: DeployMultiplePersonalCFsRequest,
): Promise<DeployPersonalCFResponse> {
	return await apiRequest<DeployPersonalCFResponse>(
		"/api/personal-custom-formats/deploy-multiple",
		{
			method: "POST",
			json: payload,
		},
	);
}

/**
 * Fetch personal custom format deployments
 */
export async function fetchPersonalCFDeployments(
	instanceId?: string,
): Promise<PersonalCFDeploymentsResponse> {
	const url = instanceId
		? `/api/personal-custom-formats/deployments?instanceId=${instanceId}`
		: "/api/personal-custom-formats/deployments";

	return await apiRequest<PersonalCFDeploymentsResponse>(url);
}

/**
 * Check for personal custom format updates
 */
export async function fetchPersonalCFUpdates(
	instanceId?: string,
	serviceType?: "RADARR" | "SONARR",
): Promise<PersonalCFUpdatesResponse> {
	const params = new URLSearchParams();
	if (instanceId) params.set("instanceId", instanceId);
	if (serviceType) params.set("serviceType", serviceType);

	const queryString = params.toString();
	const url = queryString
		? `/api/personal-custom-formats/updates?${queryString}`
		: "/api/personal-custom-formats/updates";

	return await apiRequest<PersonalCFUpdatesResponse>(url);
}

/**
 * Stop tracking a personal custom format deployment
 */
export async function deletePersonalCFDeployment(
	deploymentId: string,
): Promise<{ success: boolean; message: string }> {
	return await apiRequest<{ success: boolean; message: string }>(
		`/api/personal-custom-formats/deployments/${deploymentId}`,
		{
			method: "DELETE",
		},
	);
}
