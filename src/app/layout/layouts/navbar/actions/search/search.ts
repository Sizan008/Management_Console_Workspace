import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../../../core/auth/auth.service';
import { MenuService } from '../../../../service/menu.service';
import { SidebarService } from '../../../../service/sidebar.service';

@Component({
    selector: 'app-search',
    imports: [],
    templateUrl: './search.html',
    standalone: true,
    styleUrl: './search.scss'
})
export class Search {

    private router = inject(Router);
    private menuService = inject(MenuService);
    private sidebarService = inject(SidebarService);
    private authService = inject(AuthService);
    private toastr = inject(ToastrService);

    /**
     * Resolve a typed quick route (e.g. "GRPROL") against the user's resource list
     * and open the matching page, mirroring what a sidebar menu click does.
     */
    handleFastPath(input: HTMLInputElement): void {
        const enteredCode = input.value.trim();
        if (!enteredCode) return;

        const match = this.menuService.findByQuickRoute(enteredCode);
        if (!match) {
            this.toastr.warning('Invalid Route Number.', 'Invalid');
            input.select();
            return;
        }

        const route = this.menuService.resolveRoute(match);
        if (!route) {
            this.toastr.warning(`No page is configured for "${match.FunctionName}".`, 'Invalid');
            input.select();
            return;
        }

        // Same bookkeeping as a menu click, so the interceptor headers and
        // activity logs carry the function this page belongs to.
        this.authService.setFunctionContext(match.FunctionId, match.FunctionName);

        this.router.navigate([route]).then(success => {
            if (!success) {
                this.toastr.warning('Unable to open that page.', 'Invalid');
                return;
            }
            input.value = '';
            input.blur();
            this.sidebarService.setCurrentPageName(match.FunctionName);
            this.sidebarService.closeDrawer();
        }).catch(err => {
            // No wildcard route is registered, so an unmapped routePath rejects here.
            console.error(`Fast path navigation to "${route}" failed:`, err);
            this.toastr.error(`"${match.FunctionName}" is not available.`, 'Error');
        });
    }

}
