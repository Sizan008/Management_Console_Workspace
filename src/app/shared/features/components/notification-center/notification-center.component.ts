import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InAppNotification, NovuService } from '../../../services/novu.service';
import { GenericDataGrid } from '../../../common-components/generic-component-type/generic-data-grid';
import { CheckboxChangeEvent } from '../../../common-components/generic-component-type/generic-data-grid/generic-data-grid';


@Component({
  selector: 'app-notification-center',
  standalone: true,
  imports: [CommonModule, GenericDataGrid],
  templateUrl: './notification-center.component.html',
  styleUrl: './notification-center.component.scss'
})
export class NotificationCenterComponent implements OnInit, OnDestroy {
  notifications: InAppNotification[] = [];
  unreadCount = 0;

  constructor(private novuService: NovuService) {}

  ngOnInit() {
    console.log('NotificationCenter ngOnInit');

    // প্রথমে রিফ্রেশ করুন
    this.novuService.refreshNow();

    // তারপর সাবস্ক্রাইব করুন
    this.novuService.getNotifications().subscribe(notifs => {
      console.log('Notifications updated:', notifs);
      this.notifications = notifs;
    });

    this.novuService.getUnreadCount().subscribe(count => {
      console.log('Unread count:', count);
      this.unreadCount = count;
    });
  }

  ngOnDestroy() {}

  loadNotifications() {
    this.novuService.getNotifications().subscribe(notifs => {
      this.notifications = notifs.map(n => ({
        ...n,
        // Ensure read is boolean
        read: n.read === true
      }));
    });
  }

  markAsRead(event: string) {
    const notif = JSON.parse(event) as InAppNotification;
    if (!notif.read) {
      this.novuService.markAsRead(notif._id);
    }
  }

//   deleteNotification(event: string) {
//     const notif = JSON.parse(event) as InAppNotification;
//     this.novuService.deleteNotification(notif._id);
//   }

  onReadStatusChanged(event: CheckboxChangeEvent) {
    const notif = event.item as InAppNotification;
    if (event.value !== notif.read) {
      if (event.value) {
        this.novuService.markAsRead(notif._id);
      } else {
        // Optionally allow unmarking (not typical)
        // this.novuService.markAsUnread(notif._id);
      }
    }
  }

  onMarkAllRead(event: { property: string; checked: boolean }) {
    if (event.property === 'read' && event.checked) {
      this.markAllAsRead();
    }
  }

  markAllAsRead() {
    this.novuService.markAllAsRead();
  }

  formatTime(dateStr?: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }
}
