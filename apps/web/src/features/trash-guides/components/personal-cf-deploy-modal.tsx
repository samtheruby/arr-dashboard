"use client";

import { useState, useMemo } from "react";
import type { PersonalCustomFormat } from "@arr/shared";
import { useDeployMultiplePersonalCFs } from "../../../hooks/api/usePersonalCustomFormats";
import { useServicesQuery } from "../../../hooks/api/useServicesQuery";
import { Button, Alert, AlertDescription, Badge, EmptyState } from "../../../components/ui";
import { X, Rocket, CheckCircle, AlertCircle, Loader2, Server } from "lucide-react";
import { toast } from "sonner";

interface PersonalCFDeployModalProps {
	customFormats: PersonalCustomFormat[];
	onClose: () => void;
	onSuccess?: () => void;
}

export const PersonalCFDeployModal = ({
	customFormats,
	onClose,
	onSuccess,
}: PersonalCFDeployModalProps) => {
	const deployMutation = useDeployMultiplePersonalCFs();
	const { data: servicesData } = useServicesQuery();

	const [selectedInstanceId, setSelectedInstanceId] = useState<string>("");
	const [deploymentResults, setDeploymentResults] = useState<{
		created: string[];
		updated: string[];
		failed: Array<{ name: string; error: string }>;
	} | null>(null);

	// Get service type from custom formats (they should all be the same)
	const serviceType = customFormats[0]?.serviceType;

	// Filter instances by service type
	const availableInstances = useMemo(() => {
		if (!servicesData || !serviceType) return [];
		return servicesData.filter((instance) => instance.type === serviceType);
	}, [servicesData, serviceType]);

	const handleDeploy = async () => {
		if (!selectedInstanceId) {
			toast.error("Please select an instance");
			return;
		}

		try {
			const result = await deployMutation.mutateAsync({
				personalCFIds: customFormats.map((cf) => cf.id),
				instanceId: selectedInstanceId,
			});

			setDeploymentResults(result);

			// Show summary toast
			const totalSuccess = result.created.length + result.updated.length;
			const totalFailed = result.failed.length;

			if (totalFailed === 0) {
				toast.success(`Successfully deployed ${totalSuccess} custom format${totalSuccess !== 1 ? 's' : ''}`);
			} else if (totalSuccess === 0) {
				toast.error(`Failed to deploy all ${totalFailed} custom format${totalFailed !== 1 ? 's' : ''}`);
			} else {
				toast.warning(
					`Deployed ${totalSuccess} custom format${totalSuccess !== 1 ? 's' : ''}, ${totalFailed} failed`
				);
			}

			onSuccess?.();
		} catch (error) {
			console.error("Deployment failed:", error);
			const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
			toast.error("Deployment failed", { description: errorMessage });
		}
	};

	const handleClose = () => {
		if (deploymentResults) {
			onSuccess?.();
		}
		onClose();
	};

	const isPending = deployMutation.isPending;
	const isComplete = !!deploymentResults;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<div className="bg-bg-card border border-border rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-border">
					<h2 className="text-xl font-semibold text-fg">
						Deploy Personal Custom Format{customFormats.length !== 1 ? 's' : ''}
					</h2>
					<button onClick={handleClose} className="text-fg-muted hover:text-fg" disabled={isPending}>
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-y-auto p-6 space-y-6">
					{!isComplete ? (
						<>
							{/* Custom Formats to Deploy */}
							<div>
								<label className="block text-sm font-medium text-fg mb-2">
									Custom Formats ({customFormats.length})
								</label>
								<div className="space-y-2">
									{customFormats.map((cf) => (
										<div
											key={cf.id}
											className="flex items-center justify-between p-3 rounded-lg border border-border bg-bg-subtle"
										>
											<div className="flex items-center gap-2">
												<span className="text-sm font-medium text-fg">{cf.name}</span>
												<Badge variant="outline">v{cf.version}</Badge>
											</div>
											<Badge variant={cf.serviceType === "RADARR" ? "blue" : "purple"}>
												{cf.serviceType}
											</Badge>
										</div>
									))}
								</div>
							</div>

							{/* Instance Selection */}
							<div>
								<label className="block text-sm font-medium text-fg mb-2">
									Select Instance <span className="text-danger">*</span>
								</label>
								{availableInstances.length === 0 ? (
									<EmptyState
										icon={Server}
										title={`No ${serviceType} instances found`}
										description="Please add an instance in the Services settings"
										className="py-8"
									/>
								) : (
									<div className="space-y-2">
										{availableInstances.map((instance) => (
											<label
												key={instance.id}
												className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
													selectedInstanceId === instance.id
														? "border-primary bg-primary/10"
														: "border-border bg-bg-subtle hover:bg-bg-hover"
												}`}
											>
												<input
													type="radio"
													name="instance"
													value={instance.id}
													checked={selectedInstanceId === instance.id}
													onChange={(e) => setSelectedInstanceId(e.target.value)}
													disabled={isPending}
													className="text-primary focus:ring-primary"
												/>
												<div className="flex-1">
													<div className="font-medium text-fg">{instance.label}</div>
													<div className="text-xs text-fg-muted">
														{instance.url} • {instance.type}
													</div>
												</div>
												{instance.tags && instance.tags.length > 0 && (
													<div className="flex gap-1">
														{instance.tags.slice(0, 3).map((tag) => (
															<Badge key={tag} variant="outline" className="text-xs">
																{tag}
															</Badge>
														))}
														{instance.tags.length > 3 && (
															<Badge variant="outline" className="text-xs">
																+{instance.tags.length - 3}
															</Badge>
														)}
													</div>
												)}
											</label>
										))}
									</div>
								)}
							</div>
						</>
					) : (
						<>
							{/* Deployment Results */}
							<div className="space-y-4">
								{/* Success - Created */}
								{deploymentResults.created.length > 0 && (
									<Alert variant="success">
										<CheckCircle className="h-4 w-4" />
										<AlertDescription>
											<div className="font-medium mb-1">
												Created {deploymentResults.created.length} custom format
												{deploymentResults.created.length !== 1 ? 's' : ''}
											</div>
											<ul className="text-sm list-disc list-inside">
												{deploymentResults.created.map((name) => (
													<li key={name}>{name}</li>
												))}
											</ul>
										</AlertDescription>
									</Alert>
								)}

								{/* Success - Updated */}
								{deploymentResults.updated.length > 0 && (
									<Alert variant="success">
										<CheckCircle className="h-4 w-4" />
										<AlertDescription>
											<div className="font-medium mb-1">
												Updated {deploymentResults.updated.length} custom format
												{deploymentResults.updated.length !== 1 ? 's' : ''}
											</div>
											<ul className="text-sm list-disc list-inside">
												{deploymentResults.updated.map((name) => (
													<li key={name}>{name}</li>
												))}
											</ul>
										</AlertDescription>
									</Alert>
								)}

								{/* Failures */}
								{deploymentResults.failed.length > 0 && (
									<Alert variant="danger">
										<AlertCircle className="h-4 w-4" />
										<AlertDescription>
											<div className="font-medium mb-1">
												Failed to deploy {deploymentResults.failed.length} custom format
												{deploymentResults.failed.length !== 1 ? 's' : ''}
											</div>
											<ul className="text-sm space-y-1">
												{deploymentResults.failed.map((failure) => (
													<li key={failure.name}>
														<strong>{failure.name}:</strong> {failure.error}
													</li>
												))}
											</ul>
										</AlertDescription>
									</Alert>
								)}
							</div>
						</>
					)}
				</div>

				{/* Footer */}
				<div className="flex items-center justify-end gap-2 p-6 border-t border-border">
					{!isComplete ? (
						<>
							<Button variant="ghost" onClick={onClose} disabled={isPending}>
								Cancel
							</Button>
							<Button
								variant="primary"
								onClick={handleDeploy}
								disabled={isPending || !selectedInstanceId || availableInstances.length === 0}
								className="gap-2"
							>
								{isPending ? (
									<>
										<Loader2 className="h-4 w-4 animate-spin" />
										Deploying...
									</>
								) : (
									<>
										<Rocket className="h-4 w-4" />
										Deploy
									</>
								)}
							</Button>
						</>
					) : (
						<Button variant="primary" onClick={handleClose}>
							Close
						</Button>
					)}
				</div>
			</div>
		</div>
	);
};
