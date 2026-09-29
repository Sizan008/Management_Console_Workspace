import {inject, Injectable} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {ComponentType} from '@angular/cdk/portal';

@Injectable({
  providedIn: 'root'
})
export class DialogUtils {

  dialog = inject(MatDialog);

  constructor() {
  }

  openDialog<T, D = any>(component: ComponentType<T>, pickTablePair: D, pickTableDataSource:any []) {

    let data = {
      pickTablePair: pickTablePair,
      pickTableDataSource: pickTableDataSource
    };

    return this.dialog.open(component, {
      data,
      disableClose: false
    });
  }

}
