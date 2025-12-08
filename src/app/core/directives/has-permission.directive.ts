import { Directive, Input, TemplateRef, ViewContainerRef, effect } from '@angular/core';
import { Permission } from '../models/user.model';
import { AuthService } from '../services/auth.service';

@Directive({
    selector: '[appHasPermission]',
    standalone: true
})
export class HasPermissionDirective {
    private permission: Permission | null = null;

    constructor(
        private templateRef: TemplateRef<any>,
        private viewContainer: ViewContainerRef,
        private authService: AuthService
    ) {
        effect(() => {
            this.updateView();
        });
    }

    @Input()
    set appHasPermission(permission: Permission) {
        this.permission = permission;
        this.updateView();
    }

    private updateView() {
        if (this.permission && this.authService.hasPermission(this.permission)) {
            if (this.viewContainer.length === 0) {
                this.viewContainer.createEmbeddedView(this.templateRef);
            }
        } else {
            this.viewContainer.clear();
        }
    }
}
