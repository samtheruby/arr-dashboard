"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
	CreatePersonalCFRequest,
	UpdatePersonalCFRequest,
	DeployMultiplePersonalCFsRequest,
	PersonalCFListResponse,
	PersonalCFResponse,
	PersonalCFDeploymentsResponse,
	PersonalCFUpdatesResponse,
	DeployPersonalCFResponse,
} from "@arr/shared";
import {
	fetchPersonalCustomFormats,
	fetchPersonalCustomFormat,
	createPersonalCustomFormat,
	updatePersonalCustomFormat,
	deletePersonalCustomFormat,
	deployMultiplePersonalCFs,
	fetchPersonalCFDeployments,
	fetchPersonalCFUpdates,
	deletePersonalCFDeployment,
} from "../../lib/api-client/personal-custom-formats";

// ============================================================================
// Query Key Constants
// ============================================================================

/**
 * Query key prefix for personal custom formats queries.
 * Used for invalidation to match all personal CF queries regardless of params.
 */
export const PERSONAL_CFS_QUERY_KEY = ["personal-custom-formats"] as const;

/**
 * Query key prefix for personal CF deployments queries.
 */
export const PERSONAL_CF_DEPLOYMENTS_QUERY_KEY = ["personal-cf-deployments"] as const;

// ============================================================================
// Query Hooks - CRUD Operations
// ============================================================================

/**
 * Hook to fetch all personal custom formats with optional filtering by service type
 */
export const usePersonalCustomFormats = (serviceType?: "RADARR" | "SONARR") =>
	useQuery<PersonalCFListResponse>({
		queryKey: [...PERSONAL_CFS_QUERY_KEY, { serviceType }],
		queryFn: () => fetchPersonalCustomFormats(serviceType),
		staleTime: 2 * 60 * 1000, // 2 minutes
		refetchOnMount: true,
	});

/**
 * Hook to fetch a single personal custom format by ID
 */
export const usePersonalCustomFormat = (id: string | null) =>
	useQuery<PersonalCFResponse>({
		queryKey: [...PERSONAL_CFS_QUERY_KEY, id],
		queryFn: () => fetchPersonalCustomFormat(id!),
		enabled: !!id,
		staleTime: 5 * 60 * 1000, // 5 minutes
	});

// ============================================================================
// Query Hooks - Deployment Operations
// ============================================================================

/**
 * Hook to fetch personal custom format deployments with optional filtering by instance
 */
export const usePersonalCFDeployments = (instanceId?: string) =>
	useQuery<PersonalCFDeploymentsResponse>({
		queryKey: [...PERSONAL_CF_DEPLOYMENTS_QUERY_KEY, { instanceId }],
		queryFn: () => fetchPersonalCFDeployments(instanceId),
		staleTime: 1 * 60 * 1000, // 1 minute
		refetchOnMount: true,
	});

/**
 * Hook to check for personal custom format updates
 */
export const usePersonalCFUpdates = (instanceId?: string, serviceType?: "RADARR" | "SONARR") =>
	useQuery<PersonalCFUpdatesResponse>({
		queryKey: ["personal-cf-updates", { instanceId, serviceType }],
		queryFn: () => fetchPersonalCFUpdates(instanceId, serviceType),
		staleTime: 30 * 1000, // 30 seconds
		refetchOnMount: true,
	});

// ============================================================================
// Mutation Hooks - CRUD Operations
// ============================================================================

/**
 * Hook to create a new personal custom format
 */
export const useCreatePersonalCustomFormat = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: CreatePersonalCFRequest) => createPersonalCustomFormat(payload),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: PERSONAL_CFS_QUERY_KEY });
		},
	});
};

/**
 * Hook to update an existing personal custom format
 */
export const useUpdatePersonalCustomFormat = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, payload }: { id: string; payload: UpdatePersonalCFRequest }) =>
			updatePersonalCustomFormat(id, payload),
		onSuccess: (_, variables) => {
			void queryClient.invalidateQueries({ queryKey: PERSONAL_CFS_QUERY_KEY });
			void queryClient.invalidateQueries({
				queryKey: [...PERSONAL_CFS_QUERY_KEY, variables.id],
			});
			// Invalidate deployments as they track versions
			void queryClient.invalidateQueries({ queryKey: PERSONAL_CF_DEPLOYMENTS_QUERY_KEY });
			void queryClient.invalidateQueries({ queryKey: ["personal-cf-updates"] });
		},
	});
};

/**
 * Hook to delete a personal custom format (soft delete)
 */
export const useDeletePersonalCustomFormat = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => deletePersonalCustomFormat(id),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: PERSONAL_CFS_QUERY_KEY });
			void queryClient.invalidateQueries({ queryKey: PERSONAL_CF_DEPLOYMENTS_QUERY_KEY });
		},
	});
};

// ============================================================================
// Mutation Hooks - Deployment Operations
// ============================================================================

/**
 * Hook to deploy multiple personal custom formats to an instance
 */
export const useDeployMultiplePersonalCFs = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: DeployMultiplePersonalCFsRequest) => deployMultiplePersonalCFs(payload),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: PERSONAL_CF_DEPLOYMENTS_QUERY_KEY });
			void queryClient.invalidateQueries({ queryKey: ["personal-cf-updates"] });
		},
	});
};

/**
 * Hook to stop tracking a personal custom format deployment
 */
export const useDeletePersonalCFDeployment = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (deploymentId: string) => deletePersonalCFDeployment(deploymentId),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: PERSONAL_CF_DEPLOYMENTS_QUERY_KEY });
			void queryClient.invalidateQueries({ queryKey: ["personal-cf-updates"] });
		},
	});
};
