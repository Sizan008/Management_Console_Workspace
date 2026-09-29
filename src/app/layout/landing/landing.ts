import { Component, OnInit } from '@angular/core';

import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {Router} from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    ReactiveFormsModule
  ],
  templateUrl: './landing.html',
  styleUrl: './landing.scss'
})
export class Landing implements OnInit {
  timeForm!: FormGroup;
  show=false;
  constructor(
     private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
  ) { }

  async ngOnInit() {
     this.timeForm = this.fb.group({
      time: ['',  Validators.required]
    });

   }

  login() {
    this.authService.login();
  }

  onTimeChange(time: string) {
    console.log('Selected Time:', time);
  }



}
