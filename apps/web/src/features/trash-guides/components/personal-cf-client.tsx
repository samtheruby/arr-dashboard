"use client";

import { useState } from "react";
import type { PersonalCustomFormat } from "@arr/shared";
import { PersonalCFManager } from "./personal-cf-manager";
import { PersonalCFEditor } from "./personal-cf-editor";
import { PersonalCFDeployModal } from "./personal-cf-deploy-modal";

/**
 * Personal Custom Formats Client Component
 *
 * Orchestrates the personal custom formats interface with:
 * - Manager (list view with search/filter)
 * - Editor modal (create/edit)
 * - Deploy modal (deploy to instances)
 */
export const PersonalCFClient = () => {
	const [editorOpen, setEditorOpen] = useState(false);
	const [editingCF, setEditingCF] = useState<PersonalCustomFormat | null>(null);
	const [deployModalOpen, setDeployModalOpen] = useState(false);
	const [deployingCFs, setDeployingCFs] = useState<PersonalCustomFormat[]>([]);

	const handleCreateNew = () => {
		setEditingCF(null);
		setEditorOpen(true);
	};

	const handleEdit = (cf: PersonalCustomFormat) => {
		setEditingCF(cf);
		setEditorOpen(true);
	};

	const handleCloseEditor = () => {
		setEditorOpen(false);
		setEditingCF(null);
	};

	const handleDeploy = (cf: PersonalCustomFormat) => {
		setDeployingCFs([cf]);
		setDeployModalOpen(true);
	};

	const handleCloseDeploy = () => {
		setDeployModalOpen(false);
		setDeployingCFs([]);
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="rounded-lg border border-border bg-bg-subtle p-6">
				<h3 className="text-lg font-semibold text-fg mb-2">Personal Custom Formats</h3>
				<p className="text-fg/70">
					Create and manage your own custom formats for Radarr and Sonarr. These are separate from
					TRaSH Guides and can be tailored to your specific needs.
				</p>
			</div>

			{/* Personal CF Manager */}
			<PersonalCFManager
				onCreateNew={handleCreateNew}
				onEdit={handleEdit}
				onDeploy={handleDeploy}
			/>

			{/* Editor Modal */}
			{editorOpen && (
				<PersonalCFEditor
					customFormat={editingCF}
					onClose={handleCloseEditor}
					onSuccess={handleCloseEditor}
				/>
			)}

			{/* Deploy Modal */}
			{deployModalOpen && deployingCFs.length > 0 && (
				<PersonalCFDeployModal
					customFormats={deployingCFs}
					onClose={handleCloseDeploy}
					onSuccess={handleCloseDeploy}
				/>
			)}
		</div>
	);
};
