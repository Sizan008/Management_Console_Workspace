interface CommonResponse {
    status: boolean;
    message: string;
}

export interface CommonResponseObject<D> extends CommonResponse{
    payload: D;
}

export interface CommonResponseList<D> extends CommonResponse{
    payload: D[];
}

export interface CommonResponsePageable<D> extends CommonResponse{
    payload: Pageable<D>;
}

export interface Pageable<D> {
    content: D[];
    pageable: {};
    totalElements: number;
}
