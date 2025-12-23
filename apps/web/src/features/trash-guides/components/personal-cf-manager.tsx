"use client";

import { useState, useEffect } from "react";
import type { PersonalCustomFormat } from "@arr/shared";
import {
	usePersonalCustomFormats,
	useDeletePersonalCustomFormat,
	PERSONAL_CFS_QUERY_KEY,
} from "../../../hooks/api/usePersonalCustomFormats";
import {
	Alert,
	AlertTitle,
	AlertDescription,
	EmptyState,
	Skeleton,
	Button,
	Badge,
} from "../../../components/ui";
import { Plus, Search, Edit, Trash2, Rocket, Layers, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface PersonalCFManagerProps {
	serviceType?: "RADARR" | "SONARR";
	onCreateNew: () => void;
	onEdit: (customFormat: PersonalCustomFormat) => void;
	onDeploy: (customFormat: PersonalCustomFormat) => void;
}

export const PersonalCFManager = ({
	serviceType,
	onCreateNew,
	onEdit,
	onDeploy,
}: PersonalCFManagerProps) => {
	// Search state
	const [searchInput, setSearchInput] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");

	// Debounce search input to avoid excessive re-renders
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearch(searchInput);
		}, 300);
		return () => clearTimeout(timer);
	}, [searchInput]);

	// Fetch data
	const { data, isLoading, error } = usePersonalCustomFormats(serviceType);
	const deleteMutation = useDeletePersonalCustomFormat();

	// Modals
	const [deleteConfirm, setDeleteConfirm] = useState<{
		id: string;
		name: string;
	} | null>(null);

	// Filter custom formats based on search
	const customFormats = (data?.customFormats || []).filter((cf) =>
		debouncedSearch
			? cf.name.toLowerCase().includes(debouncedSearch.toLowerCase())
			: true
	);

	const handleDelete = async (id: string) => {
		try {
			await deleteMutation.mutateAsync(id);
			toast.success("Custom format deleted successfully");
			setDeleteConfirm(null);
		} catch (error) {
			console.error("Delete failed:", error);
			const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
			toast.error("Failed to delete custom format", { description: errorMessage });
		}
	};

	if (isLoading) {
		return (
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				<Skeleton className="h-48" />
				<Skeleton className="h-48" />
				<Skeleton className="h-48" />
			</div>
		);
	}

	if (error) {
		return (
			<Alert variant="danger">
				<AlertTitle>Failed to load personal custom formats</AlertTitle>
				<AlertDescription>
					{error instanceof Error ? error.message : "Please try again"}
				</AlertDescription>
			</Alert>
		);
	}

	return (
		<div className="space-y-4">
			{/* Header with Title and Actions */}
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-semibold text-fg">
					Personal Custom Formats {serviceType ? `(${serviceType})` : ""}
				</h2>
				<Button variant="primary" onClick={onCreateNew} className="gap-2">
					<Plus className="h-4 w-4" />
					New Custom Format
				</Button>
			</div>

			{/* Search Bar */}
			<div className="flex items-center gap-3 rounded-lg border border-border bg-bg-subtle/50 p-4">
				<div className="flex-1 max-w-md">
					<div className="relative">
						<input
							type="text"
							placeholder="Search custom formats by name..."
							value={searchInput}
							onChange={(e) => setSearchInput(e.target.value)}
							className="w-full rounded-lg border border-border bg-bg-subtle px-4 py-2 pl-10 text-sm text-fg placeholder:text-fg-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
						/>
						<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
					</div>
				</div>
			</div>

			{/* Custom Formats Grid */}
			{customFormats.length === 0 ? (
				<EmptyState
					icon={Layers}
					title={debouncedSearch ? "No custom formats found" : "No custom formats yet"}
					description={
						debouncedSearch
							? "Try adjusting your search query"
							: "Create your first personal custom format to get started"
					}
					action={
						!debouncedSearch ? (
							<Button variant="primary" onClick={onCreateNew} className="gap-2">
								<Plus className="h-4 w-4" />
								Create Custom Format
							</Button>
						) : undefined
					}
				/>
			) : (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{customFormats.map((cf) => (
						<div
							key={cf.id}
							className="rounded-lg border border-border bg-bg-subtle p-4 hover:bg-bg-hover transition-colors"
						>
							{/* Header */}
							<div className="flex items-start justify-between mb-3">
								<div className="flex-1">
									<h3 className="font-medium text-fg mb-1">{cf.name}</h3>
									<div className="flex items-center gap-2">
										<Badge variant={cf.serviceType === "RADARR" ? "blue" : "purple"}>
											{cf.serviceType}
										</Badge>
										<Badge variant="outline">v{cf.version}</Badge>
									</div>
								</div>
							</div>

							{/* Metadata */}
							<div className="text-xs text-fg-muted mb-4 space-y-1">
								<div className="flex items-center gap-1">
									<Layers className="h-3 w-3" />
									<span>{cf.specifications.length} specification{cf.specifications.length !== 1 ? 's' : ''}</span>
								</div>
								<div>
									Updated: {new Date(cf.updatedAt).toLocaleDateString()}
								</div>
							</div>

							{/* Actions */}
							<div className="flex items-center gap-2">
								<Button
									variant="secondary"
									size="sm"
									onClick={() => onEdit(cf)}
									className="flex-1 gap-1"
								>
									<Edit className="h-3 w-3" />
									Edit
								</Button>
								<Button
									variant="primary"
									size="sm"
									onClick={() => onDeploy(cf)}
									className="flex-1 gap-1"
								>
									<Rocket className="h-3 w-3" />
									Deploy
								</Button>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => setDeleteConfirm({ id: cf.id, name: cf.name })}
									className="gap-1 text-danger hover:text-danger hover:bg-danger/10"
								>
									<Trash2 className="h-3 w-3" />
								</Button>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Delete Confirmation Modal */}
			{deleteConfirm && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
					<div className="bg-bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4 shadow-lg">
						<div className="flex items-start gap-3 mb-4">
							<div className="rounded-full bg-danger/10 p-2">
								<AlertCircle className="h-5 w-5 text-danger" />
							</div>
							<div className="flex-1">
								<h3 className="font-semibold text-fg mb-1">Delete Custom Format</h3>
								<p className="text-sm text-fg-muted">
									Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This action
									cannot be undone.
								</p>
							</div>
							<button
								onClick={() => setDeleteConfirm(null)}
								className="text-fg-muted hover:text-fg"
							>
								<X className="h-5 w-5" />
							</button>
						</div>

						<div className="flex justify-end gap-2">
							<Button variant="ghost" onClick={() => setDeleteConfirm(null)}>
								Cancel
							</Button>
							<Button
								variant="danger"
								onClick={() => handleDelete(deleteConfirm.id)}
								disabled={deleteMutation.isPending}
							>
								{deleteMutation.isPending ? "Deleting..." : "Delete"}
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
