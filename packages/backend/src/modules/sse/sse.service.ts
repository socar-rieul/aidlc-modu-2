import { Injectable, MessageEvent, OnModuleDestroy } from '@nestjs/common';
import { interval, map, merge, Observable, Subject, takeUntil } from 'rxjs';
import type { SessionSseEvent, StoreSseEvent } from '@table-order/shared';

@Injectable()
export class SseService implements OnModuleDestroy {
  private sessionChannels = new Map<string, Subject<MessageEvent>>();
  private storeChannels = new Map<string, Subject<MessageEvent>>();
  private shutdown$ = new Subject<void>();

  subscribeSession(sessionId: string): Observable<MessageEvent> {
    return this.subscribe(this.sessionChannels, sessionId);
  }
  subscribeStore(storeId: string): Observable<MessageEvent> {
    return this.subscribe(this.storeChannels, storeId);
  }
  emitToSession(sessionId: string, event: SessionSseEvent): void {
    // type 필드는 SSE `event:` 줄로 직렬화 — 클라가 addEventListener(eventName)로 받을 수 있게 함
    this.sessionChannels.get(sessionId)?.next({ type: event.type, data: event } as MessageEvent);
  }
  emitToStore(storeId: string, event: StoreSseEvent): void {
    this.storeChannels.get(storeId)?.next({ type: event.type, data: event } as MessageEvent);
  }

  onModuleDestroy(): void {
    this.shutdown$.next();
    this.shutdown$.complete();
    for (const s of this.sessionChannels.values()) s.complete();
    for (const s of this.storeChannels.values()) s.complete();
  }

  private subscribe(map_: Map<string, Subject<MessageEvent>>, key: string): Observable<MessageEvent> {
    if (!map_.has(key)) map_.set(key, new Subject<MessageEvent>());
    const subject = map_.get(key)!;
    const keepAlive = interval(15_000).pipe(map(() => ({ data: { type: 'keep-alive' } } as MessageEvent)));
    return merge(subject.asObservable(), keepAlive).pipe(takeUntil(this.shutdown$));
  }
}
