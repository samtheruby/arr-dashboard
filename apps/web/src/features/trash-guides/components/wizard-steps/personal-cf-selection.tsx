"use client";

import { useState, useEffect } from "react";
import type { PersonalCustomFormat } from "@arr/shared";
import { usePersonalCustomFormats } from "../../../../hooks/api/usePersonalCustomFormats";
import { Alert, AlertDescription, Skeleton, EmptyState } from "../../../../components/ui";
import { AlertCircle, Layers, Search, RotateCcw } from "lucide-react";

interface PersonalCFSelectionProps {
	serviceType: "RADARR" | "SONARR";
	initialSelections: Record<string, {
		selected: boolean;
		scoreOverride?: number;
	}>;
	onSelectionsChange: (selections: Record<string, {
		selected: boolean;
		scoreOverride?: number;
	}>) => void;
}

export const PersonalCFSelection = ({
	serviceType,
	initialSelections,
	onSelectionsChange,
}: PersonalCFSelectionProps) => {
	const [selections, setSelections] = useState(initialSelections);
	const [searchQuery, setSearchQuery] = useState("");

	// Fetch personal custom formats for the service type
	const { data, isLoading, error } = usePersonalCustomFormats(serviceType);

	// Sync selections with parent
	useEffect(() => {
		onSelectionsChange(selections);
	}, [selections, onSelectionsChange]);

	const toggleCF = (cfId: string) => {
		setSelections((prev) => ({
			...prev,
			[cfId]: {
				selected: !prev[cfId]?.selected,
				scoreOverride: prev[cfId]?.scoreOverride,
			},
		}));
	};

	const updateScore = (cfId: string, score: string) => {
		const scoreValue = score === "" ? undefined : Number.parseInt(score, 10);
		setSelections((prev) => ({
			...prev,
			[cfId]: {
				selected: prev[cfId]?.selected ?? false,
				scoreOverride: scoreValue,
			},
		}));
	};

	const selectAll = () => {
		const customFormats = data?.customFormats || [];
		setSelections((prev) => {
			const updated = { ...prev };
			for (const cf of customFormats) {
				updated[cf.id] = {
					selected: true,
					scoreOverride: prev[cf.id]?.scoreOverride,
				};
			}
			return updated;
		});
	};

	const deselectAll = () => {
		const customFormats = data?.customFormats || [];
		setSelections((prev) => {
			const updated = { ...prev };
			for (const cf of customFormats) {
				updated[cf.id] = {
					selected: false,
					scoreOverride: prev[cf.id]?.scoreOverride,
				};
			}
			return updated;
		});
	};

	if (isLoading) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-12 w-full" />
				<div className="space-y-2">
					<Skeleton className="h-24 w-full" />
					<Skeleton className="h-24 w-full" />
					<Skeleton className="h-24 w-full" />
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<Alert variant="danger">
				<AlertCircle className="h-4 w-4" />
				<AlertDescription>
					{error instanceof Error
						? error.message
						: "Failed to load personal custom formats"}
				</AlertDescription>
			</Alert>
		);
	}

	const customFormats = data?.customFormats || [];
	const selectedCount = Object.values(selections).filter(s => s?.selected).length;

	// Filter based on search
	const searchLower = searchQuery.toLowerCase().trim();
	const filteredCFs = searchLower
		? customFormats.filter(cf =>
				cf.name.toLowerCase().includes(searchLower)
			)
		: customFormats;

	if (customFormats.length === 0) {
		return (
			<div className="space-y-4">
				<EmptyState
					icon={Layers}
					title="No Personal Custom Formats"
					description={`You haven't created any personal custom formats for ${serviceType} yet. Create them in the "Personal Custom Formats" tab.`}
				/>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Info Banner */}
			<Alert>
				<AlertDescription>
					Select personal custom formats to include in this template. You can mix these with TRaSH Guides custom formats.
					{selectedCount > 0 && ` ${selectedCount} personal format${selectedCount !== 1 ? 's' : ''} selected.`}
				</AlertDescription>
			</Alert>

			{/* Search Bar */}
			<div className="relative">
				<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
				<input
					type="text"
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					placeholder="Search personal custom formats..."
					className="w-full rounded-lg border border-border/50 bg-bg py-3 pl-10 pr-4 text-fg placeholder:text-fg-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
				/>
			</div>

			{/* Bulk Actions */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={selectAll}
						className="text-sm text-primary hover:text-primary/80 transition"
					>
						Select All
					</button>
					<span className="text-fg-muted">•</span>
					<button
						type="button"
						onClick={deselectAll}
						className="text-sm text-primary hover:text-primary/80 transition"
					>
						Deselect All
					</button>
				</div>
				<span className="text-sm text-fg-muted">
					{filteredCFs.length} of {customFormats.length} shown
				</span>
			</div>

			{/* Custom Formats List */}
			{filteredCFs.length === 0 ? (
				<EmptyState
					icon={Search}
					title="No Results"
					description="No custom formats match your search query"
				/>
			) : (
				<div className="space-y-2">
					{filteredCFs.map((cf) => {
						const selection = selections[cf.id];
						const scoreOverride = selection?.scoreOverride;

						return (
							<div
								key={cf.id}
								className="rounded-lg p-4 border border-border/50 bg-bg-subtle transition-all hover:border-primary/50 hover:shadow-md"
							>
								<div className="flex items-start gap-3">
									<input
										type="checkbox"
										checked={selection?.selected ?? false}
										onChange={() => toggleCF(cf.id)}
										className="mt-1 h-5 w-5 rounded border-border/50 bg-bg-subtle text-primary focus:ring-2 focus:ring-primary/50 cursor-pointer transition"
									/>
									<div className="flex-1">
										<div className="flex items-center gap-2 mb-2">
											<span className="font-medium text-fg">{cf.name}</span>
											<span className="inline-flex items-center gap-1 rounded bg-purple-500/20 px-2 py-0.5 text-xs font-medium text-purple-300">
												Personal CF
											</span>
											<span className="inline-flex items-center gap-1 rounded bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-300">
												v{cf.version}
											</span>
											{scoreOverride !== undefined && (
												<span className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-300">
													Custom Score
												</span>
											)}
										</div>

										<div className="space-y-2">
											{/* Metadata */}
											<div className="flex items-center gap-2 text-xs text-fg-muted">
												<span>{cf.specifications.length} specification{cf.specifications.length !== 1 ? 's' : ''}</span>
												{cf.includeCustomFormatWhenRenaming && (
													<>
														<span>•</span>
														<span>Include when renaming</span>
													</>
												)}
											</div>

											{/* Score Input */}
											<div className="flex items-center gap-2 flex-wrap">
												<label className="text-sm text-fg-muted">Score:</label>
												<input
													type="number"
													value={scoreOverride ?? ""}
													onChange={(e) => updateScore(cf.id, e.target.value)}
													placeholder="0"
													className="w-20 rounded border border-border/50 bg-bg px-2 py-1 text-sm text-fg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 transition"
												/>
												{scoreOverride !== undefined && (
													<button
														type="button"
														onClick={() => updateScore(cf.id, "")}
														className="text-xs text-primary hover:text-primary/80 transition flex items-center gap-1"
														title="Reset to 0"
													>
														<RotateCcw className="h-3 w-3" />
														Reset
													</button>
												)}
											</div>
										</div>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
};
