import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import jsQR from 'jsqr';
import { radius, theme } from '../theme';
import { Button, Muted } from './ui';

/**
 * ブラウザで QR を読む。
 * expo-camera のバーコード読み取りは web に対応していないので、
 * カメラ映像を自前で取り出して jsQR にかける。
 */
export function QrScanner({
  onRead,
  onCancel,
}: {
  onRead: (value: string) => void;
  onCancel: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const doneRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let raf = 0;

    const stop = () => {
      cancelAnimationFrame(raf);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };

    const scan = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!doneRef.current && video && canvas && video.readyState === 4) {
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (w && h) {
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, w, h);
            const found = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, {
              inversionAttempts: 'dontInvert',
            });
            if (found?.data) {
              doneRef.current = true;
              stop();
              onRead(found.data);
              return;
            }
          }
        }
      }
      raf = requestAnimationFrame(scan);
    };

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(
          'このブラウザではカメラを使えません。コードを貼り付けてください。'
        );
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        raf = requestAnimationFrame(scan);
      } catch {
        setError(
          'カメラを開けませんでした。許可を確かめるか、コードを貼り付けてください。'
        );
      }
    };

    start();
    return stop;
  }, [onRead]);

  if (error) {
    return (
      <View style={styles.center}>
        <Muted style={{ textAlign: 'center', marginBottom: 16 }}>{error}</Muted>
        <Button label="やめる" tone="quiet" onPress={onCancel} />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.viewport}>
        {/* web 専用ファイルなので、DOM の要素をそのまま置ける */}
        <video
          ref={videoRef}
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        <View pointerEvents="none" style={styles.reticle} />
      </View>
      <Text style={styles.hint}>相手の画面の QR を枠に入れてください</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  center: { alignItems: 'center', paddingVertical: 24 },
  viewport: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: '#1B1712',
  },
  reticle: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    margin: '14%',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    borderRadius: radius.sm,
  },
  hint: { color: theme.inkSoft, fontSize: 13, marginTop: 12 },
});
