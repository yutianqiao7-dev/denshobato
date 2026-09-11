import { Platform, Share } from 'react-native';

/**
 * 長い文字列を、その端末でいちばん渡しやすい形で渡す。
 *
 * ブラウザならクリップボードに、駄目なら共有シートに。
 * どちらも駄目なときは、画面に出ている文字を自分で選んでもらう。
 */
export type HandOff = 'copied' | 'shared' | 'none';

/** 新しい方の書き込み。安全な文脈（https か localhost）でしか使えない */
async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * 古い方の書き込み。
 * iframe の中など、新しい API が塞がれている場所でも通ることがある。
 */
function copyBySelection(text: string): boolean {
  try {
    const box = document.createElement('textarea');
    box.value = text;
    box.setAttribute('readonly', '');
    // 画面には出さないが、選べる場所に置く
    box.style.position = 'fixed';
    box.style.top = '0';
    box.style.left = '0';
    box.style.opacity = '0';
    document.body.appendChild(box);
    box.select();
    box.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(box);
    return ok;
  } catch {
    return false;
  }
}

export async function copyOrShare(
  text: string,
  title?: string
): Promise<HandOff> {
  if (Platform.OS === 'web') {
    if (await writeClipboard(text)) return 'copied';
    if (copyBySelection(text)) return 'copied';
  }
  try {
    await Share.share({ message: text, title });
    return 'shared';
  } catch {
    return 'none';
  }
}
