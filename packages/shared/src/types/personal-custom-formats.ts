/**
 * Personal Custom Formats Types
 *
 * Types for user-created custom formats (not from TRaSH Guides)
 */

import type { CustomFormatSpecification } from "./trash-guides.js";

// ============================================================================
// Core Personal Custom Format Types
// ============================================================================

/**
 * Personal custom format created by the user
 */
export interface PersonalCustomFormat {
	id: string;
	userId: string;
	name: string;
	serviceType: "RADARR" | "SONARR";
	includeCustomFormatWhenRenaming: boolean;
	specifications: CustomFormatSpecification[];
	version: number;
	createdAt: string;
	updatedAt: string;
	deletedAt?: string;
}

// ============================================================================
// Request/Response Types
// ============================================================================

/**
 * Request to create a new personal custom format
 */
export interface CreatePersonalCFRequest {
	name: string;
	serviceType: "RADARR" | "SONARR";
	includeCustomFormatWhenRenaming?: boolean;
	specifications: CustomFormatSpecification[];
}

/**
 * Request to update an existing personal custom format
 */
export interface UpdatePersonalCFRequest {
	name?: string;
	includeCustomFormatWhenRenaming?: boolean;
	specifications?: CustomFormatSpecification[];
}

/**
 * Response from personal CF create/update operations
 */
export interface PersonalCFResponse {
	success: boolean;
	customFormat: PersonalCustomFormat;
}

/**
 * Response from personal CF list operation
 */
export interface PersonalCFListResponse {
	success: boolean;
	customFormats: PersonalCustomFormat[];
}

// ============================================================================
// Deployment Types
// ============================================================================

/**
 * Personal custom format deployment record
 */
export interface PersonalCFDeployment {
	id: string;
	personalCFId: string;
	personalCFName: string;
	instanceId: string;
	instanceLabel: string;
	instanceCFId: number;
	deployedVersion: number;
	currentVersion: number;
	needsUpdate: boolean;
	deployedAt: string;
}

/**
 * Request to deploy multiple personal CFs to an instance
 */
export interface DeployMultiplePersonalCFsRequest {
	personalCFIds: string[];
	instanceId: string;
}

/**
 * Response from personal CF deployment
 */
export interface DeployPersonalCFResponse {
	success: boolean;
	created: string[];
	updated: string[];
	failed: Array<{ name: string; error: string }>;
}

/**
 * Response from deployments list operation
 */
export interface PersonalCFDeploymentsResponse {
	success: boolean;
	deployments: PersonalCFDeployment[];
}

/**
 * Update notification for personal CF deployment
 */
export interface PersonalCFUpdateNotification {
	deploymentId: string;
	personalCFId: string;
	personalCFName: string;
	instanceId: string;
	instanceLabel: string;
	serviceType: "RADARR" | "SONARR";
	deployedVersion: number;
	currentVersion: number;
}

/**
 * Response from updates check operation
 */
export interface PersonalCFUpdatesResponse {
	success: boolean;
	hasUpdates: boolean;
	updates: PersonalCFUpdateNotification[];
	totalDeployed: number;
	outdatedCount: number;
}
