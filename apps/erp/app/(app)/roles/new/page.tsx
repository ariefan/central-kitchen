'use client';

import { RoleFormSimple } from "@/components/rbac/role-form-simple";

export default function NewRolePage() {
    return (
        <div className="container mx-auto py-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold">Create New Role</h1>
                <p className="text-muted-foreground">
                    Create a new role with specific permissions for your organization.
                </p>
            </div>

            <RoleFormSimple
                mode="create"
                onSubmit={async () => {
                    // Handle form submission
                    window.location.href = '/roles';
                }}
                onCancel={() => {
                    window.location.href = '/roles';
                }}
            />
        </div>
    );
}