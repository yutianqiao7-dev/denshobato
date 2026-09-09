import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import jsQR from 'jsqr';
import { radius, theme } from '../theme';
import { Button, Muted } from './ui';

/** 画像を読み込んで、その中の QR を探す */
async function decodeImage(file: File): Promise<string | null> {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
    // 大きすぎる写真はそのままだと重いので、長辺 1600px に収める
    const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
    const w = Math.round(image.width * scale);
    const h = Math.round(image.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(image, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    return (
      jsQR(data, w, h, { inversionAttempts: 'attemptBoth' })?.data ?? null
    );
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * ブラウザで QR を読む。
 * expo-camera のバーコード読み取りは web に対応していないので、
 * カメラ映像を自前で取り出して jsQR にかける。
 * 写真やスクリーンショットからも読める。
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
  const fileRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const doneRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

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
        setError('このブラウザではカメラを使えません。');
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
        setError('カメラを開けませんでした。許可を確かめてください。');
      }
    };

    start();
    return stop;
  }, [onRead]);

  const onPick = async (file?: File | null) => {
    if (!file) return;
    setNote(null);
    const value = await decodeImage(file);
    if (!value) {
      setNote('その画像から QR を見つけられませんでした。');
      return;
    }
    doneRef.current = true;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onRead(value);
  };

  const picker = (
    <>
      {/* web 専用ファイルなので、DOM の要素をそのまま置ける */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          onPick(file);
        }}
      />
      <Button
        label="画像から読み取る"
        tone="quiet"
        onPress={() => fileRef.current?.click()}
        style={{ marginTop: 12, alignSelf: 'stretch' }}
      />
    </>
  );

  if (error) {
    return (
      <View style={styles.center}>
        <Muted style={{ textAlign: 'center', marginBottom: 4 }}>
          {error}
          {'\n'}
          写真に撮ってある QR なら、カメラなしでも読めます。
        </Muted>
        {picker}
        {!!note && <Text style={styles.note}>{note}</Text>}
        <Button
          label="やめる"
          tone="quiet"
          onPress={onCancel}
          style={{ marginTop: 10, alignSelf: 'stretch' }}
        />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.viewport}>
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
      {picker}
      {!!note && <Text style={styles.note}>{note}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', alignSelf: 'stretch' },
  center: { alignItems: 'center', alignSelf: 'stretch', paddingVertical: 24 },
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
  note: { color: '#A03E5B', fontSize: 13, marginTop: 10, textAlign: 'center' },
});
