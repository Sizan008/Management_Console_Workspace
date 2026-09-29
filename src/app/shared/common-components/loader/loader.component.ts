import { Component, inject, OnInit } from '@angular/core';
import { LoaderService } from '../../services/loader.service';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-loader',
  imports:[
    AsyncPipe
  ],
  templateUrl: './loader.component.html',
  styleUrls: ['./loader.component.scss'],
})
export class LoaderComponent  {

 readonly svc = inject(LoaderService);

}
