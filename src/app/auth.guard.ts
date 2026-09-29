// access.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AccessGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
  /*  const userAccessList = JSON.parse(localStorage.getItem('userAccessList') || '[]');
    const requestedPath = state.url.split('/')[1]; // e.g. "mx"

    // check if userAccessList has this AppRoute
    const hasAccess = userAccessList.some((item: any) =>
      item.AppRoute && item.AppRoute.replace(/^\//, '') === requestedPath
    );

    if (!hasAccess) {
      this.router.navigate(['/not-authorized']);
      return false;
    }*/
    return true;
  }
}
