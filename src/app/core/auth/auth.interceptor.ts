import {
    HttpErrorResponse,
    HttpEvent,
    HttpHandlerFn,
    HttpRequest
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, throwError, finalize } from 'rxjs';
import { LoaderService, SKIP_LOADER } from '../../shared/services/loader.service';
import { environment } from '../../../environments/environment';

export const authInterceptor = (
    req: HttpRequest<unknown>,
    next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {

    const loader = inject(LoaderService);

    // Skip the global overlay when the caller opted out (SKIP_LOADER context, or
    // the legacy X-Skip-Loader header) or for address search typeaheads.
    const skipLoaderContext = req.context.get(SKIP_LOADER);
    const skipLoaderHeader = req.headers.get?.('X-Skip-Loader') === 'true';
    const isAddressSearch = req.url.includes('/AddressMv/');
    const shouldShowLoader = !skipLoaderContext && !skipLoaderHeader && !isAddressSearch;

    if (shouldShowLoader) {
        // 👉 Show loader before request
        loader.show();
    }

    const cloudNetConsoleBaseUrl = environment.myBaseUrl2.replace(/\/+$/, '');
    const isCloudNetConsoleRequest = req.url.startsWith(cloudNetConsoleBaseUrl);
    const existingAuthorization = req.headers.get('Authorization');
    const storedToken = sessionStorage.getItem('access_token');
    const authorizationHeader = existingAuthorization ||
        (!isCloudNetConsoleRequest && storedToken ? `Bearer ${storedToken}` : null);

    let newReq = req.clone({
        headers: req.headers
            .set('branchId', '1')
    });

    if (authorizationHeader) {
        newReq = newReq.clone({ headers: newReq.headers.set('Authorization', authorizationHeader) });
    }

    // If caller requested skipping loader, remove the header before forwarding
    const forwardedReq = newReq.headers.get?.('X-Skip-Loader') ? newReq.clone({ headers: newReq.headers.delete('X-Skip-Loader') }) : newReq;

    return next(forwardedReq).pipe(
        catchError((error) => {
            return throwError(() => error);
        }),

        // 👉 Hide loader only if we showed it
        finalize(() => {
            if (shouldShowLoader) loader.hide();
        })
    );
};
