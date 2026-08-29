/**
 * AudioContext Fingerprint Intelligence Collector
 * Uses synthetic OfflineAudioContext DSP calculation to measure audio pipeline signatures.
 * Never requests microphone access, never records user audio.
 */

import type { BaseCollectorResult, AudioData, AudioStatus } from '../types';
import { fnv1a32 } from '../utils/hash';

export async function collectAudio(timeoutMs: number = 1500): Promise<BaseCollectorResult<AudioData>> {
  const start = performance.now();

  const isBrowser = typeof window !== 'undefined';
  const OfflineAudioContextCtor =
    isBrowser &&
    (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext);

  if (!OfflineAudioContextCtor) {
    return {
      id: 'audio_fingerprint',
      category: 'AUDIO',
      supported: false,
      available: false,
      status: 'UNAVAILABLE',
      confidence: 'HIGH',
      durationMs: performance.now() - start,
      data: {
        status: 'UNAVAILABLE',
      },
    };
  }

  return new Promise<BaseCollectorResult<AudioData>>((resolve) => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let isFinished = false;

    const finalize = (status: AudioStatus, data?: Partial<AudioData>, errorMsg?: string) => {
      if (isFinished) return;
      isFinished = true;

      if (timer) {
        clearTimeout(timer);
        timer = null;
      }

      resolve({
        id: 'audio_fingerprint',
        category: 'AUDIO',
        supported: true,
        available: status === 'SIGNATURE_AVAILABLE',
        status: status === 'ERROR' ? 'ERROR' : status === 'TIMEOUT' ? 'TIMEOUT' : status === 'BLOCKED' ? 'BLOCKED' : 'SUCCESS',
        confidence: 'HIGH',
        durationMs: performance.now() - start,
        data: {
          status,
          ...data,
        },
        error: errorMsg,
      });
    };

    timer = setTimeout(() => {
      finalize('TIMEOUT', undefined, 'AudioContext rendering timed out');
    }, timeoutMs);

    try {
      // 1 channel, 44100 samples, 44.1kHz sample rate (1 second buffer)
      const context = new OfflineAudioContextCtor(1, 44100, 44100);

      // Oscillator: triangle wave at 10,000 Hz
      const oscillator = context.createOscillator();
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(10000, context.currentTime);

      // DynamicsCompressor: custom non-linear compression
      const compressor = context.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-50, context.currentTime);
      compressor.knee.setValueAtTime(40, context.currentTime);
      compressor.ratio.setValueAtTime(12, context.currentTime);
      compressor.attack.setValueAtTime(0, context.currentTime);
      compressor.release.setValueAtTime(0.25, context.currentTime);

      // Connect graph
      oscillator.connect(compressor);
      compressor.connect(context.destination);

      oscillator.start(0);

      context
        .startRendering()
        .then((renderedBuffer: AudioBuffer) => {
          if (isFinished) return;

          const channelData = renderedBuffer.getChannelData(0);
          let sum = 0;
          const sampleLength = channelData.length;

          // Sample step calculation
          for (let i = 4500; i < 5000; i++) {
            sum += Math.abs(channelData[i]);
          }

          const rawHashString = `${sum.toFixed(6)}_${sampleLength}`;
          const hash = fnv1a32(rawHashString);

          finalize('SIGNATURE_AVAILABLE', {
            hash,
            sampleSum: sum,
            sampleLength,
          });
        })
        .catch((err: unknown) => {
          finalize('ERROR', undefined, err instanceof Error ? err.message : 'Audio rendering failed');
        });
    } catch (err: unknown) {
      finalize('BLOCKED', undefined, err instanceof Error ? err.message : 'AudioContext blocked');
    }
  });
}
