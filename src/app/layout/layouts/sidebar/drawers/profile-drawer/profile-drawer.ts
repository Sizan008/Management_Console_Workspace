import { Component, NgZone, signal, Type, ViewChild, inject, OnDestroy, OnInit,  } from '@angular/core';
import { AsyncPipe, CommonModule } from '@angular/common';
import { ChatBox } from './drawers/chat-box/chat-box';
import { MatIcon } from '@angular/material/icon';
import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { ThemePickerComponent } from '../../themePicker/theme-picker.component';

import {  Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Router, RouterModule } from '@angular/router';

import { Observable, Subscription } from 'rxjs';

import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UserService } from '../../../../../core/user/user.service';
import { User } from '../../../../../core/user/user.types';
import { AuthService } from '../../../../../core/auth/auth.service';
import { GenericDataGrid } from '../../../../../shared/common-components/generic-component-type/generic-data-grid';
import { GenericModal } from '../../../../../shared/common-components/generic-component-type/generic-modal/generic-modal';
import { InputTextBox } from '../../../../../shared/common-components/input-types/input-text-box/input-text-box';
import { NotificationDetailModalComponent } from '../../../../../shared/features/components/notification/notification-detail-modal.component';
import { NotificationPopoverComponent } from '../../../../../shared/features/components/notification/notification-popover.component';
import { EditProfileModal } from '../../../../../shared/features/edit-profile-modal/edit-profile-modal';
import { ServiceRequestDialog } from '../../../../../shared/features/service-request/service-request-dialog/service-request-dialog';
import { ChatPreview, ChatService } from '../../../../../shared/services/chat.service';
import { ToastHelperService } from '../../../../../shared/services/toast-helper.service';
import { NotificationService } from '../../../../../shared/services/notification.service';
import { InAppNotification, NovuService, ChatMessage } from '../../../../../shared/services/novu.service';
import { SidebarService } from '../../../../service/sidebar.service';



@Component({
  selector: 'app-profile-drawer',
  imports: [
    ChatBox,
    MatIcon,
    AsyncPipe,
    NotificationDetailModalComponent,
    RouterModule,
    CommonModule,
    InputTextBox,
    GenericModal,
  MatProgressSpinnerModule,
  FormsModule,
  ReactiveFormsModule,
  ],
  templateUrl: './profile-drawer.html',
  standalone: true,
  styleUrl: './profile-drawer.scss',
  animations: [
    trigger('expandCollapse', [
      state('open', style({ height: '*', opacity: 1 })),
      state('closed', style({ height: '0px', opacity: 0 })),
      transition('open <=> closed', animate('300ms ease-in-out')),
    ]),
  ],
})
export class ProfileDrawer implements OnInit, OnDestroy {
  isNotificationsOpen = false;
  isMessagingOpen = false;
searchForm = new FormGroup({
  query: new FormControl('', { nonNullable: true })
});
searching = false;                     // spinner flag
searchResults$!: Observable<string[]>; // raw user list
  selectedChat?: ChatPreview;
  isChatOpen = signal(false);
  chatWith: string;
  private popoverOverlayRef: OverlayRef | null = null;
  private detailOverlayRef: OverlayRef | null = null;
  private overlayRef: OverlayRef | null = null;
  selectedNotification: InAppNotification | null = null;
  showDetailModal = false;
  @ViewChild(GenericDataGrid) modalComponentRef?: GenericDataGrid;
  showModal = false;
  modalComponent?: Type<any>;
  modalComponentData?: any = null;
  modalOkButtonText = signal('Submit Request'); // Use signal for button text
  private modalSubscriptions: Subscription[] = [];
  private subscriptionCheckTimer: any = null;
  private userSubscription?: Subscription;
  private novuSubscription?: Subscription;
  private messageStreamSubscription?: Subscription;
  private lastAutoOpenKey?: string;
  private autoOpenInitialized = false;

  openSections: { [key: string]: boolean } = {
    notifications: false,
    messaging: false,
  };

  showEditProfileModal = false;
  // modalComponent?: Type<any>;
  modalData?: any;
  chatPreviews$!: Observable<ChatPreview[]>;
  //modalData?: User;
  currentUser?: User;

  // Branch information from sessionStorage
  officeCode?: string;
  officeNm?: string;
  txnDt?: string;

  constructor(
    public notificationService: NotificationService,
    private userService: UserService,
    private router: Router,
    private toastHelper: ToastHelperService,
    public novuService: NovuService,
    private overlay: Overlay,
    private ngZone: NgZone,
    public chatService: ChatService,
    private authService: AuthService,
    private sidebarService: SidebarService
  ) {
    this.searchResults$ = this.chatService.searchResults$;
    this.syncCurrentUserId(this.novuService.getActiveSubscriberId() ?? undefined);
    this.userSubscription = this.userService.user$.subscribe((user: User) => {
      this.syncCurrentUserId(user?.username);
    });
    this.novuSubscription = this.novuService.onSubscriberIdChanged().subscribe((id) => {
      this.syncCurrentUserId(id ?? undefined);
    });
    this.messageStreamSubscription = this.novuService
      .getChatMessages()
      .subscribe((messages) => this.handleIncomingMessages(messages));
  }

  /** Initials derived from the current user's name, for the avatar. */
  get userInitials(): string {
    const name = this.currentUser?.name?.trim();
    if (!name) return 'U';
    const parts = name.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? '';
    const second = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + second).toUpperCase() || 'U';
  }

  private syncCurrentUserId(id?: string) {
    if (!id) return;
    if (this.currentUserId === id) return;
    this.currentUserId = id;
  }
  private handleIncomingMessages(messages: ChatMessage[]) {
    if (!this.currentUserId || !messages?.length) return;

    const inbound = messages
      .filter(
        (msg) =>
          msg.receiverUserId === this.currentUserId &&
          msg.senderUserId !== this.currentUserId
      )
      .sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

    if (!inbound.length) return;

    const latest = inbound[inbound.length - 1];
    const key = `${latest.chatId}|${latest.timestamp}`;

    if (!this.autoOpenInitialized) {
      this.lastAutoOpenKey = key;
      this.autoOpenInitialized = true;
      return;
    }

    if (this.lastAutoOpenKey === key) return;

    this.lastAutoOpenKey = key;
    this.autoOpenInitialized = true;

    const preview: ChatPreview = {
      chatId: latest.chatId,
      partner: latest.senderUserId,
      lastMessage: latest.notificationBody,
      time: this.formatPreviewTime(latest.timestamp),
      unread: 1,
    };

    this.openChat(preview);
  }
  private formatPreviewTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  onSearchInput() {
  const term = this.searchForm.get('query')?.value?.trim() ?? '';
  this.searching = true;
  this.chatService.setSearchTerm(term);
  // hide spinner after debounce
  setTimeout(() => this.searching = false, 350);
}
private currentUserId = localStorage.getItem('userId') || '';
  openChatFromSearch(user: string) {
    if (!this.currentUserId) {
      return;
    }
    const chatId = [this.currentUserId, user].sort().join('_');
    const preview: ChatPreview = {
      chatId,
      partner: user,
      lastMessage: '',
      time: '',
      unread: 0
    };
    this.openChat(preview);
    this.searchForm.get('query')?.setValue('');
  }

  openChat(chat: ChatPreview) {
    this.selectedChat = chat;
    this.isChatOpen.set(true);
    this.chatService.markChatAsRead(chat.chatId);

    // clear search UI
    this.searchForm.get('query')?.setValue('');
    this.chatService.setSearchTerm(''); // hide suggestions
    this.searching = false;

    // Ensure latest chat history is loaded for this subscriber
    // so the chat box is not empty after a full page reload.
    this.novuService
      .refreshNow()
      .catch((err) => console.error('NOVU: refreshNow failed on openChat:', err));
  }

  ngOnInit(): void {
    this.userSubscription = this.userService.user$.subscribe({
      next: (user) => {
        this.currentUser = user;
      },
      error: (error) => {
        console.error('Failed to load current user profile from stream', error);
      },
    });
     // this.chatPreviews$ = this.chatService.getChatPreviews();
    this.chatPreviews$ = this.chatService.getCombinedList();

    // Arriving via "View all messages" in the navbar popover: land on Messaging.
    // The flag covers the case where this drawer was just created (it would have
    // missed the event); the subscription covers a drawer that is already open.
    if (this.sidebarService.consumeMessagingRequest()) {
      this.openSections['messaging'] = true;
    }
    this.modalSubscriptions.push(
      this.sidebarService.openMessaging$.subscribe(() => {
        this.sidebarService.consumeMessagingRequest();
        this.openSections['messaging'] = true;
      })
    );

    // Load branch information from sessionStorage
    this.loadBranchInfoFromSession();
  }

  private loadBranchInfoFromSession(): void {
    this.officeCode = sessionStorage.getItem('officeCode') || '';
    this.officeNm = sessionStorage.getItem('officeNm') || '';
    const rawDate = sessionStorage.getItem('txnDt');   // "2024-11-27 00:00:00"
    this.txnDt = rawDate ? rawDate.split(' ')[0] : '';
  }

  /**
   * Switch the active branch/office.
   * TODO: wire up to the branch-selection flow (e.g. open a modal with
   * the office list, then persist officeCode/officeNm to sessionStorage
   * and refresh branch info). Kept as a stub so the UI action is in place.
   */
  switchBranch(): void {
    console.log('Switch branch requested for current office:', this.officeCode);
  }

  changeTxnDate(newDate: string): void {
    this.txnDt = newDate;
    sessionStorage.setItem('txnDt', newDate ? `${newDate} 00:00:00` : '');
  }

  /**
   * Footer note for the Edit Profile modal. Stays empty until the user payload
   * carries a timestamp, so nothing is shown rather than a made-up date.
   */
  get profileLastUpdatedNote(): string {
    const raw = (this.currentUser as any)?.lastUpdated ?? (this.currentUser as any)?.updatedAt;
    if (!raw) return '';

    const updated = new Date(raw);
    if (isNaN(updated.getTime())) return '';

    return `Last updated ${updated.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })}`;
  }

  openEditProfileModal() {
    const openModalWithUser = (user: User) => {
      this.modalComponent = EditProfileModal;
      this.modalData = user;
      this.showEditProfileModal = true;
    };

    if (!this.currentUser) {
      console.warn('User profile is not available yet; cannot open edit modal.');
      return;
    }

    openModalWithUser(this.currentUser);
  }



  closeEditProfileModal() {
    this.showEditProfileModal = false;
  }


  /** ✅ Modal result  */
  // onProfileUpdated(result: any) {
  //   console.log('✅ Profile updated:', result);
  //   this.showEditProfileModal = false;
  // }
  onProfileUpdated(updatedData: any) {
    console.log('🟢 Updated profile data received from modal:', updatedData);
    this.toastHelper.success('Profile updated', 'Success');
  }

  toggleChat(chatWith: string) {
    this.isChatOpen.set(!this.isChatOpen());
    if (this.chatWith !== chatWith) this.isChatOpen.set(true);
    if (this.isChatOpen()) this.chatWith = chatWith;

    if (this.isChatOpen()) {
      this.notificationService.clearMessages();
    }
  }

  closeChatFromChild() {
    this.isChatOpen.set(false);
  }

  toggleSection(section: string): void {
    this.openSections[section] = !this.openSections[section];

    if (section === 'notifications' && this.openSections[section]) {
      this.notificationService.clearNotifications();
    }
    if (section === 'messaging' && this.openSections[section]) {
      this.notificationService.clearMessages();
    }
  }

  isSectionOpen(section: string): boolean {
    return this.openSections[section];
  }

  toggleNotificationsPopover(event: MouseEvent) {
    if (this.overlayRef?.hasAttached()) {
      this.overlayRef.dispose();
      return;
    }

    const trigger = event.currentTarget as HTMLElement;

    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(trigger)
      .withPositions([
        // Primary: open UPWARD — anchor the popover's bottom to the trigger's
        // bottom so the panel grows up the screen and sits higher.
        {
          originX: 'end',
          originY: 'bottom',
          overlayX: 'end',
          overlayY: 'bottom',
          offsetY: 47,   // nudge a little DOWN (increase to move further down)
          offsetX: 458,   // nudge a little RIGHT (increase to move further right)
        },
        // Fallback: if there isn't room above, open downward from the top.
        {
          originX: 'end',
          originY: 'top',
          overlayX: 'end',
          overlayY: 'top',
          offsetY: 8,
        },
      ])
      .withFlexibleDimensions(false)
      .withPush(true);

    this.overlayRef = this.overlay.create({
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-transparent-backdrop',
      positionStrategy,
      // Reposition (not close) so the popover survives the scroll-block the
      // detail modal applies when it opens on top of it.
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
    });

    const portal = new ComponentPortal(NotificationPopoverComponent);
    const compRef = this.overlayRef.attach(portal);

    // The list stays open behind the detail modal; only the detail is stacked
    // on top so closing it returns the user straight to the list.
    compRef.instance.openDetail.subscribe((notif: InAppNotification) => {
      this.ngZone.run(() => this.openDetailModal(notif));
    });

    this.overlayRef.backdropClick().subscribe(() => this.overlayRef?.dispose());
  }

  closeDetailModal() {
    this.showDetailModal = false;
    this.selectedNotification = null;
  }

  private openDetailModal(notif: InAppNotification) {
    if (this.detailOverlayRef?.hasAttached()) {
      this.detailOverlayRef.dispose();
      this.detailOverlayRef = null;
    }

    const positionStrategy = this.overlay
      .position()
      .global()
      .centerHorizontally()
      .centerVertically();

    this.detailOverlayRef = this.overlay.create({
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-transparent-backdrop',
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.block(),
      panelClass: 'notification-detail-overlay-panel',
    });

    const portal = new ComponentPortal(NotificationDetailModalComponent);
    const compRef = this.detailOverlayRef.attach(portal);

    compRef.instance.notification = notif;

    compRef.instance.close.subscribe(() => {
      this.detailOverlayRef?.dispose();
      this.detailOverlayRef = null;
    });

    this.detailOverlayRef.backdropClick().subscribe(() => {
      this.detailOverlayRef?.dispose();
      this.detailOverlayRef = null;
    });
  }



  ngOnDestroy() {
    this.overlayRef?.dispose();
    this.detailOverlayRef?.dispose();
    this.modalSubscriptions.forEach((sub) => sub.unsubscribe());
    if (this.subscriptionCheckTimer) {
      clearInterval(this.subscriptionCheckTimer);
      this.subscriptionCheckTimer = null;
    }
    this.userSubscription?.unsubscribe();
  }

  goToNotes() {
    this.router.navigate(['/feature/usernote']);
    this.sidebarService.closeDrawer();
  }

  goToPreferences() {
    this.router.navigate(['/feature/settings/preferences']);
    this.sidebarService.closeDrawer();
  }

  goToChangePassword() {
    // Redirects out to Keycloak rather than routing to an in-app form.
    this.sidebarService.closeDrawer();
    this.authService.changePassword();
  }

  // Modal related methods
  openServiceRequestModal() {
    this.openModal(ServiceRequestDialog, {
      title: 'Service Request',
      description: 'Fill out the service request form',
    });
  }

  openModal(componentToLoad?: Type<any>, data?: any) {
    console.log('=== OPENING MODAL ===');
    console.log('Component to load:', componentToLoad);
    console.log('Component name:', componentToLoad?.name);

    console.log('Data to pass:', data);
    // Reset modal state
    this.showModal = false;
    this.modalComponent = undefined;
    this.modalOkButtonText.set('Submit Request'); // Reset to default

    setTimeout(() => {
      this.modalComponent = componentToLoad;
      this.modalComponentData = data;
      this.showModal = true;
      console.log('Modal opened with component:', this.modalComponent?.name);

      // Re-subscribe to child outputs after modal is opened
      setTimeout(() => this.subscribeToChildOutputs(), 500);
    }, 50);
  }

  private subscribeToChildOutputs() {
    // Clear any existing subscriptions
    this.modalSubscriptions.forEach((sub) => sub.unsubscribe());
    this.modalSubscriptions = [];

    // Clear any pending timer
    if (this.subscriptionCheckTimer) {
      clearInterval(this.subscriptionCheckTimer);
      this.subscriptionCheckTimer = null;
    }

    // Check periodically if modal component instance is available
    this.subscriptionCheckTimer = setInterval(() => {
      if (
        this.modalComponentRef &&
        (this.modalComponentRef as any).componentRef
      ) {
        const childInstance = (this.modalComponentRef as any).componentRef
          .instance;
        if (childInstance && childInstance.okButtonTextChange) {
          // Subscribe to okButtonTextChange
          const sub = childInstance.okButtonTextChange.subscribe(
            (text: string) => {
              this.onOkButtonTextChange(text);
            }
          );
          this.modalSubscriptions.push(sub);

          // Set initial button text from the child's getter
          if (childInstance.okButtonText) {
            setTimeout(() => {
              this.modalOkButtonText.set(childInstance.okButtonText);
            }, 0);
          }

          clearInterval(this.subscriptionCheckTimer);
          this.subscriptionCheckTimer = null;
        }
      }
    }, 100);

    // Clear interval after 3 seconds if not found
    setTimeout(() => {
      if (this.subscriptionCheckTimer) {
        clearInterval(this.subscriptionCheckTimer);
        this.subscriptionCheckTimer = null;
      }
    }, 3000);
  }

  onModalClose(isVisible: boolean) {
    console.log('Modal visibility changed:', isVisible);
    this.showModal = isVisible;

    if (!isVisible) {
      // Clean up subscriptions when modal closes
      this.modalSubscriptions.forEach((sub) => sub.unsubscribe());
      this.modalSubscriptions = [];

      if (this.subscriptionCheckTimer) {
        clearInterval(this.subscriptionCheckTimer);
        this.subscriptionCheckTimer = null;
      }

      // Don't clear modalComponent/modalComponentData here - let Angular handle it
      // This prevents the ExpressionChangedAfterItHasBeenCheckedError
    }
  }

  onModalVisibilityChange(isVisible: boolean) {
    // Update both modal flags based on which one was open
    if (this.showEditProfileModal) {
      this.showEditProfileModal = isVisible;
    } else {
      this.showModal = isVisible;
    }
    console.log('Modal visibility changed to:', isVisible);
  }

  onModalResult(result: any) {
    console.log('Modal result received:', result);

    if (!result) return;

    // Handle different modal types
    if (this.showEditProfileModal) {
      this.onProfileUpdated(result);
    } else {

    }
  }

  onModalClosed() {
    // Close whichever modal was open
    if (this.showEditProfileModal) {
      this.closeEditProfileModal();
    } else {
      this.showModal = false;
    }
  }

  onOkButtonTextChange(text: string) {
    console.log('OK button text changed to:', text);
    // Only update if modal is visible to avoid change detection errors during modal close
    if (this.showModal) {
      this.modalOkButtonText.set(text);
    }
  }


}
