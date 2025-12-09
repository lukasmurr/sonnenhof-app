import { Injectable } from '@angular/core';
import { GROUP_PERMISSIONS } from '../config/permissions.config';
import { Permission, UserGroup } from '../models/permission.model';

@Injectable({
    providedIn: 'root'
})
export class PermissionService {

    getGroupPermissions(group: UserGroup): Permission[] {
        return GROUP_PERMISSIONS[group] || [];
    }

    getGroups(): { value: UserGroup, label: string }[] {
        return [
            { value: 'admin', label: 'Admin' },
            { value: 'office', label: 'Büro' },
            { value: 'butchery', label: 'Metzgerei' },
            { value: 'sales', label: 'Verkauf' }
        ];
    }
}
