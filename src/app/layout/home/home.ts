import { Component, inject, OnInit, OnDestroy, AfterViewInit, ElementRef, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';
import { KeyclockService } from '../../core/service/keyclock.service';
import { UserService } from '../../core/user/user.service';

@Component({
  selector: 'app-home',
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home implements OnInit, AfterViewInit, OnDestroy {
  keyclock: KeyclockService = inject(KeyclockService);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private renderer = inject(Renderer2);
  private elementRef = inject(ElementRef);

  username: string;
  greeting: string;
  private mousePosition = { x: 0, y: 0 };
  private animationFrameId: number | null = null;
  private mouseMoveListener: (() => void) | null = null;

  ngOnInit(): void {
    console.log(sessionStorage)


    this.userService.user$.subscribe(res => {
      this.username = res.name;
    });

    // this.authService.getResources().subscribe(res => {
    //   localStorage.setItem('resourceList', JSON.stringify(res))
    // })

    // this.authService.getUserWiseApplications().subscribe(res => {
    //   localStorage.setItem('appList', JSON.stringify(res))
    // })

    this.greeting = this.getGreeting();
  }

  ngAfterViewInit(): void {
    // Initialize hexagon pattern after view is ready
    this.initializeHexagonPattern();
  }

  ngOnDestroy(): void {
    if (this.animationFrameId) {
      // cancelAnimationFrame(this.animationFrameId);
      // this.animationFrameId = null;
    }
    if (this.mouseMoveListener) {
      this.mouseMoveListener();
      this.mouseMoveListener = null;
    }
  }

  private initializeHexagonPattern(): void {
    // Use requestAnimationFrame to ensure DOM is fully rendered
    requestAnimationFrame(() => {
      this.createHexagonPattern();
      this.startGradientAnimation();
    });
  }

  createHexagonPattern(): void {
    const patternElement = this.elementRef.nativeElement.querySelector('#pattern');
    if (!patternElement) {
      console.error('Pattern element not found! Retrying...');
      // Retry after a short delay if element not found (for hot reload cases)
      setTimeout(() => this.createHexagonPattern(), 50);
      return;
    }
    if (patternElement.children.length > 0) {
      console.log('Pattern already exists, skipping recreation');
      return;
    }

    // Clear existing hexagons before creating new ones
    patternElement.innerHTML = '';

    // Ensure element has dimensions before calculating
    if (patternElement.clientHeight === 0 || patternElement.clientWidth === 0) {
      setTimeout(() => this.createHexagonPattern(), 50);
      return;
    }

    const countY = Math.ceil(patternElement.clientHeight / 40) + 1;
    const countX = Math.ceil(patternElement.clientWidth / 48) + 1;

    // SVG hexagon data URL with white fill and stroke
    const hexagonSvg = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODciIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgODcgMTAwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cGF0aCBkPSJNMi4xOTg3MyAyNi4xNTQ3TDQzLjUgMi4zMDk0TDg0LjgwMTMgMjYuMTU0N1Y3My44NDUzTDQzLjUgOTcuNjkwNkwyLjE5ODczIDczLjg0NTNWMjYuMTU0N1oiIGZpbGw9IiNmZmZmZmYiIHN0cm9rZT0iI2ZmZmZmZiIgc3Ryb2tlLXdpZHRoPSI0Ii8+Cjwvc3ZnPgo=';

    for (let i = 0; i < countY; i++) {
      for (let j = 0; j < countX; j++) {
        const hexagon = this.renderer.createElement('div');
        this.renderer.setStyle(hexagon, 'background', `url('${hexagonSvg}') no-repeat`);
        this.renderer.setStyle(hexagon, 'width', '44px');
        this.renderer.setStyle(hexagon, 'height', '50px');
        this.renderer.setStyle(hexagon, 'background-size', 'contain');
        this.renderer.setStyle(hexagon, 'position', 'absolute');
        this.renderer.setStyle(hexagon, 'top', `${i * 40}px`);
        this.renderer.setStyle(hexagon, 'left', `${j * 48 + ((i * 24) % 48)}px`);
        this.renderer.appendChild(patternElement, hexagon);
      }
    }
  }

  startGradientAnimation(): void {
    // Clean up existing listener if any
    if (this.mouseMoveListener) {
      this.mouseMoveListener();
      this.mouseMoveListener = null;
    }

    // Clean up existing animation if any
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Listen to document-level mouse movement for full viewport tracking
    this.mouseMoveListener = this.renderer.listen('document', 'mousemove', (event: MouseEvent) => {
      this.mousePosition = {
        x: event.clientX,
        y: event.clientY
      };
    });

    const loop = () => {
      const gradientElement = this.elementRef.nativeElement.querySelector('#gradient');
      if (gradientElement) {
        this.renderer.setStyle(
          gradientElement,
          'transform',
          `translate(${this.mousePosition.x}px, ${this.mousePosition.y}px)`
        );
      }
      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  getGreeting(): string {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const bstTime = new Date(utc + (6 * 3600000));
    const hour = bstTime.getHours();

    if (hour >= 5 && hour < 12) {
      return 'Good Morning';
    } else if (hour >= 12 && hour < 17) {
      return 'Good Afternoon';
    } else if (hour >= 17 && hour < 21) {
      return 'Good Evening';
    } else {
      return 'Good Night';
    }
  }

  groupByModuleId(resources: any[]) {
    const grouped: Record<string, { moduleId: string, moduleName: string, items: any[] }> = {};

    resources.forEach(r => {
      const attrs = r.attributes || {};
      const moduleId = String(attrs.moduleId ?? 'unknown');
      const moduleName = String(attrs.moduleName ?? 'unknown');
      if (!grouped[moduleId]) {
        grouped[moduleId] = { moduleId, moduleName, items: [] };
      }
      grouped[moduleId].items.push(r);
    });
    return grouped;
  }
}
