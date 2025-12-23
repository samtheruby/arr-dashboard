"use client";

import { useState, useEffect } from "react";
import type { PersonalCustomFormat, CustomFormatSpecification } from "@arr/shared";
import {
	useCreatePersonalCustomFormat,
	useUpdatePersonalCustomFormat,
} from "../../../hooks/api/usePersonalCustomFormats";
import { Button, Input, Badge, Alert, AlertDescription } from "../../../components/ui";
import { X, Plus, Trash2, Code, Eye, Save, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { ConditionEditor } from "./condition-editor";

interface PersonalCFEditorProps {
	customFormat?: PersonalCustomFormat | null;
	serviceType?: "RADARR" | "SONARR";
	onClose: () => void;
	onSuccess?: () => void;
}

type TabType = "visual" | "json";

export const PersonalCFEditor = ({
	customFormat,
	serviceType: initialServiceType,
	onClose,
	onSuccess,
}: PersonalCFEditorProps) => {
	const isEditing = !!customFormat;
	const createMutation = useCreatePersonalCustomFormat();
	const updateMutation = useUpdatePersonalCustomFormat();

	// Form state
	const [name, setName] = useState(customFormat?.name || "");
	const [serviceType, setServiceType] = useState<"RADARR" | "SONARR">(
		customFormat?.serviceType || initialServiceType || "RADARR"
	);
	const [includeWhenRenaming, setIncludeWhenRenaming] = useState(
		customFormat?.includeCustomFormatWhenRenaming || false
	);
	const [specifications, setSpecifications] = useState<CustomFormatSpecification[]>(
		customFormat?.specifications || []
	);
	const [activeTab, setActiveTab] = useState<TabType>("visual");
	const [jsonError, setJsonError] = useState<string | null>(null);
	const [jsonText, setJsonText] = useState("");

	// Sync JSON text with specifications when switching to JSON tab
	useEffect(() => {
		if (activeTab === "json") {
			setJsonText(JSON.stringify(specifications, null, 2));
			setJsonError(null);
		}
	}, [activeTab]);

	// Add a new empty specification
	const addSpecification = () => {
		const newSpec: CustomFormatSpecification = {
			name: "New Condition",
			implementation: "ReleaseTitleSpecification",
			negate: false,
			required: false,
			fields: {
				value: "",
			},
		};
		setSpecifications([...specifications, newSpec]);
	};

	// Remove a specification
	const removeSpecification = (index: number) => {
		setSpecifications(specifications.filter((_, i) => i !== index));
	};

	// Update a specification
	const updateSpecification = (index: number, updated: CustomFormatSpecification) => {
		const newSpecs = [...specifications];
		newSpecs[index] = updated;
		setSpecifications(newSpecs);
	};

	// Apply JSON changes
	const applyJsonChanges = () => {
		try {
			const parsed = JSON.parse(jsonText);
			if (!Array.isArray(parsed)) {
				setJsonError("JSON must be an array of specifications");
				return;
			}
			// Basic validation
			for (const spec of parsed) {
				if (!spec.name || !spec.implementation || typeof spec.negate !== "boolean") {
					setJsonError("Invalid specification format");
					return;
				}
			}
			setSpecifications(parsed);
			setJsonError(null);
			setActiveTab("visual");
			toast.success("JSON applied successfully");
		} catch (error) {
			setJsonError(error instanceof Error ? error.message : "Invalid JSON");
		}
	};

	// Validation
	const validate = (): string | null => {
		if (!name.trim()) {
			return "Name is required";
		}
		if (specifications.length === 0) {
			return "At least one specification is required";
		}
		// Check if all specs have required fields
		for (const spec of specifications) {
			if (!spec.name || !spec.implementation) {
				return "All specifications must have a name and implementation";
			}
		}
		return null;
	};

	// Save handler
	const handleSave = async () => {
		const validationError = validate();
		if (validationError) {
			toast.error(validationError);
			return;
		}

		try {
			if (isEditing && customFormat) {
				await updateMutation.mutateAsync({
					id: customFormat.id,
					payload: {
						name: name !== customFormat.name ? name : undefined,
						includeCustomFormatWhenRenaming:
							includeWhenRenaming !== customFormat.includeCustomFormatWhenRenaming
								? includeWhenRenaming
								: undefined,
						specifications: JSON.stringify(specifications) !== JSON.stringify(customFormat.specifications)
							? specifications
							: undefined,
					},
				});
				toast.success("Custom format updated successfully");
			} else {
				await createMutation.mutateAsync({
					name,
					serviceType,
					includeCustomFormatWhenRenaming: includeWhenRenaming,
					specifications,
				});
				toast.success("Custom format created successfully");
			}
			onSuccess?.();
			onClose();
		} catch (error) {
			console.error("Save failed:", error);
			const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
			toast.error("Failed to save custom format", { description: errorMessage });
		}
	};

	const isPending = createMutation.isPending || updateMutation.isPending;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<div className="bg-bg-card border border-border rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col shadow-xl">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-border">
					<h2 className="text-xl font-semibold text-fg">
						{isEditing ? "Edit Personal Custom Format" : "Create Personal Custom Format"}
					</h2>
					<button onClick={onClose} className="text-fg-muted hover:text-fg">
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-y-auto p-6 space-y-6">
					{/* Basic Info */}
					<div className="space-y-4">
						<div>
							<label className="block text-sm font-medium text-fg mb-1">
								Name <span className="text-danger">*</span>
							</label>
							<Input
								type="text"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="Enter custom format name"
								disabled={isPending}
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-fg mb-1">
								Service Type <span className="text-danger">*</span>
							</label>
							<select
								value={serviceType}
								onChange={(e) => setServiceType(e.target.value as "RADARR" | "SONARR")}
								disabled={isEditing || isPending}
								className="w-full rounded-lg border border-border bg-bg-subtle px-3 py-2 text-fg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
							>
								<option value="RADARR">Radarr</option>
								<option value="SONARR">Sonarr</option>
							</select>
							{isEditing && (
								<p className="text-xs text-fg-muted mt-1">
									Service type cannot be changed after creation
								</p>
							)}
						</div>

						<div className="flex items-center gap-2">
							<input
								type="checkbox"
								id="includeWhenRenaming"
								checked={includeWhenRenaming}
								onChange={(e) => setIncludeWhenRenaming(e.target.checked)}
								disabled={isPending}
								className="rounded border-border text-primary focus:ring-primary"
							/>
							<label htmlFor="includeWhenRenaming" className="text-sm text-fg cursor-pointer">
								Include custom format when renaming files
							</label>
						</div>
					</div>

					{/* Specifications */}
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<label className="block text-sm font-medium text-fg">
								Specifications <span className="text-danger">*</span>
								<span className="text-xs text-fg-muted ml-2">
									({specifications.length} specification{specifications.length !== 1 ? 's' : ''})
								</span>
							</label>
							<div className="flex items-center gap-2">
								{/* Tab Switcher */}
								<div className="flex rounded-lg border border-border bg-bg-subtle">
									<button
										onClick={() => setActiveTab("visual")}
										className={`px-3 py-1 text-sm rounded-l-lg transition-colors ${
											activeTab === "visual"
												? "bg-primary text-white"
												: "text-fg-muted hover:text-fg"
										}`}
									>
										<Eye className="h-3 w-3 inline mr-1" />
										Visual
									</button>
									<button
										onClick={() => setActiveTab("json")}
										className={`px-3 py-1 text-sm rounded-r-lg transition-colors ${
											activeTab === "json"
												? "bg-primary text-white"
												: "text-fg-muted hover:text-fg"
										}`}
									>
										<Code className="h-3 w-3 inline mr-1" />
										JSON
									</button>
								</div>
							</div>
						</div>

						{/* Tab Content */}
						{activeTab === "visual" ? (
							<div className="space-y-3">
								{specifications.length === 0 ? (
									<Alert variant="info">
										<AlertDescription>
											No specifications yet. Click "Add Specification" to create one.
										</AlertDescription>
									</Alert>
								) : (
									<div className="space-y-2">
										{specifications.map((spec, index) => (
											<div
												key={index}
												className="flex items-start gap-2 p-3 rounded-lg border border-border bg-bg-subtle"
											>
												<div className="flex-1 space-y-2 min-w-0">
													<Input
														type="text"
														value={spec.name}
														onChange={(e) =>
															updateSpecification(index, { ...spec, name: e.target.value })
														}
														placeholder="Specification name"
														className="text-sm"
													/>
													<select
														value={spec.implementation}
														onChange={(e) =>
															updateSpecification(index, {
																...spec,
																implementation: e.target.value,
															})
														}
														className="w-full rounded-lg border border-border bg-bg px-2 py-1 text-sm text-fg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
													>
														<option value="ReleaseTitleSpecification">Release Title</option>
														<option value="SourceSpecification">Source</option>
														<option value="ResolutionSpecification">Resolution</option>
														<option value="QualityModifierSpecification">Quality Modifier</option>
														<option value="ReleaseGroupSpecification">Release Group</option>
													</select>
													{spec.implementation === "ReleaseTitleSpecification" && (
														<Input
															type="text"
															value={String(spec.fields.value || "")}
															onChange={(e) =>
																updateSpecification(index, {
																	...spec,
																	fields: { ...spec.fields, value: e.target.value },
																})
															}
															placeholder="Regex pattern"
															className="text-sm font-mono"
														/>
													)}
													<div className="flex items-center gap-3 text-xs">
														<label className="flex items-center gap-1 cursor-pointer">
															<input
																type="checkbox"
																checked={spec.negate}
																onChange={(e) =>
																	updateSpecification(index, {
																		...spec,
																		negate: e.target.checked,
																	})
																}
																className="rounded border-border text-primary focus:ring-primary"
															/>
															<span className="text-fg-muted">Negate</span>
														</label>
														<label className="flex items-center gap-1 cursor-pointer">
															<input
																type="checkbox"
																checked={spec.required}
																onChange={(e) =>
																	updateSpecification(index, {
																		...spec,
																		required: e.target.checked,
																	})
																}
																className="rounded border-border text-primary focus:ring-primary"
															/>
															<span className="text-fg-muted">Required</span>
														</label>
													</div>
												</div>
												<Button
													variant="ghost"
													size="sm"
													onClick={() => removeSpecification(index)}
													className="text-danger hover:text-danger hover:bg-danger/10 flex-shrink-0"
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</div>
										))}
									</div>
								)}
								<Button variant="secondary" onClick={addSpecification} className="w-full gap-2">
									<Plus className="h-4 w-4" />
									Add Specification
								</Button>
							</div>
						) : (
							<div className="space-y-3">
								<textarea
									value={jsonText}
									onChange={(e) => setJsonText(e.target.value)}
									className="w-full h-64 rounded-lg border border-border bg-bg-subtle px-3 py-2 text-sm font-mono text-fg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
									placeholder="Enter JSON array of specifications"
								/>
								{jsonError && (
									<Alert variant="danger">
										<AlertCircle className="h-4 w-4" />
										<AlertDescription>{jsonError}</AlertDescription>
									</Alert>
								)}
								<Button variant="primary" onClick={applyJsonChanges} className="w-full gap-2">
									<Code className="h-4 w-4" />
									Apply JSON
								</Button>
							</div>
						)}
					</div>
				</div>

				{/* Footer */}
				<div className="flex items-center justify-end gap-2 p-6 border-t border-border">
					<Button variant="ghost" onClick={onClose} disabled={isPending}>
						Cancel
					</Button>
					<Button variant="primary" onClick={handleSave} disabled={isPending} className="gap-2">
						<Save className="h-4 w-4" />
						{isPending ? "Saving..." : isEditing ? "Update" : "Create"}
					</Button>
				</div>
			</div>
		</div>
	);
};
