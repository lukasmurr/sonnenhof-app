import { Injectable, signal, computed, inject } from '@angular/core';
import { Subject, fromEvent, filter, takeUntil } from 'rxjs';
import { NfcTagData } from '../models/stall.model';

/**
 * Service for handling NFC tag reading using Web NFC API
 * Supports both info scanning and transfer mode workflows
 */
@Injectable({
    providedIn: 'root'
})
export class NfcService {
    private ndef: NDEFReader | null = null;
    private abortController: AbortController | null = null;
    private destroy$ = new Subject<void>();

    // Signals for NFC state
    isSupported = signal<boolean>(false);
    isScanning = signal<boolean>(false);
    lastScannedTag = signal<NfcTagData | null>(null);
    error = signal<string | null>(null);

    // Event emitters
    private tagScanned$ = new Subject<NfcTagData>();
    public onTagScanned = this.tagScanned$.asObservable();

    constructor() {
        this.checkSupport();
    }

    /**
     * Check if Web NFC API is supported
     */
    private checkSupport(): void {
        if ('NDEFReader' in window) {
            this.isSupported.set(true);
        } else {
            this.isSupported.set(false);
            console.warn('Web NFC API is not supported in this browser');
        }
    }

    /**
     * Start scanning for NFC tags
     */
    async startScanning(): Promise<boolean> {
        if (!this.isSupported()) {
            this.error.set('NFC wird von diesem Gerät nicht unterstützt');
            return false;
        }

        if (this.isScanning()) {
            return true;
        }

        try {
            this.ndef = new NDEFReader();
            this.abortController = new AbortController();

            await this.ndef.scan({ signal: this.abortController.signal });
            this.isScanning.set(true);
            this.error.set(null);

            this.ndef.addEventListener('reading', (event: any) => {
                this.handleReading(event);
            });

            this.ndef.addEventListener('readingerror', () => {
                this.error.set('Fehler beim Lesen des NFC-Tags');
            });

            return true;
        } catch (err: any) {
            this.handleError(err);
            return false;
        }
    }

    /**
     * Stop scanning for NFC tags
     */
    stopScanning(): void {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        this.isScanning.set(false);
        this.ndef = null;
    }

    /**
     * Handle NFC tag reading
     */
    private handleReading(event: any): void {
        const { message, serialNumber } = event;

        for (const record of message.records) {
            if (record.recordType === 'text') {
                const textDecoder = new TextDecoder(record.encoding);
                const text = textDecoder.decode(record.data);

                try {
                    const tagData = this.parseTagData(text);
                    if (tagData) {
                        this.lastScannedTag.set(tagData);
                        this.tagScanned$.next(tagData);
                    }
                } catch (e) {
                    console.error('Failed to parse NFC tag data:', e);
                    this.error.set('Ungültiges Tag-Format');
                }
            }
        }
    }

    /**
     * Parse tag data from NFC text record
     * Expected format: "stall:stall-1|box:box-1-1"
     */
    private parseTagData(text: string): NfcTagData | null {
        const parts = text.split('|');
        let stallId = '';
        let boxId = '';

        for (const part of parts) {
            const [key, value] = part.split(':');
            if (key === 'stall') stallId = value;
            if (key === 'box') boxId = value;
        }

        if (stallId && boxId) {
            return {
                stallId,
                boxId,
                timestamp: new Date().toISOString()
            };
        }

        return null;
    }

    /**
     * Write data to an NFC tag
     */
    async writeTag(data: NfcTagData): Promise<boolean> {
        if (!this.isSupported()) {
            this.error.set('NFC wird von diesem Gerät nicht unterstützt');
            return false;
        }

        try {
            const ndef = new NDEFReader();
            const text = `stall:${data.stallId}|box:${data.boxId}`;

            await ndef.write({
                records: [
                    { recordType: 'text', data: text }
                ]
            });

            return true;
        } catch (err: any) {
            this.handleError(err);
            return false;
        }
    }

    /**
     * Handle NFC errors
     */
    private handleError(err: any): void {
        if (err.name === 'NotAllowedError') {
            this.error.set('NFC-Berechtigung wurde verweigert');
        } else if (err.name === 'NotSupportedError') {
            this.error.set('NFC wird von diesem Gerät nicht unterstützt');
        } else if (err.name === 'AbortError') {
            // Scanning was intentionally stopped
            this.error.set(null);
        } else {
            this.error.set(`NFC-Fehler: ${err.message}`);
        }
        this.isScanning.set(false);
    }

    /**
     * Cleanup on service destroy
     */
    ngOnDestroy(): void {
        this.stopScanning();
        this.destroy$.next();
        this.destroy$.complete();
    }
}

// Type declaration for Web NFC API
declare class NDEFReader {
    scan(options?: { signal?: AbortSignal }): Promise<void>;
    write(message: { records: { recordType: string; data: string }[] }): Promise<void>;
    addEventListener(type: string, listener: (event: any) => void): void;
}
