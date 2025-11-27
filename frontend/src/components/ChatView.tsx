import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import clsx from 'clsx';
import type { ChatMessage } from '../services/api';
import { getBackendUrl } from '../utils/backendUrl';

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

type Props = {
  messages: ChatMessage[];
  product: { id: number; title: string; price?: string } | null;
  onSendMessage: (message: string) => Promise<void>;
  onSendImage: (file: File, caption?: string) => Promise<void>;
  loading?: boolean;
  managerUsername: string | null;
  chatUserUsername: string | null;
};

const ChatView = ({
  messages,
  product,
  onSendMessage,
  onSendImage,
  loading,
  managerUsername,
  chatUserUsername,
}: Props) => {
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backendBase = useMemo(() => getBackendUrl().replace(/\/$/, ''), []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSenderName = (direction: 'user_to_manager' | 'manager_to_user'): string =>
    direction === 'user_to_manager'
      ? chatUserUsername
        ? `@${chatUserUsername}`
        : 'Пользователь'
      : managerUsername
        ? `@${managerUsername}`
        : 'Менеджер';

  const resolveAttachmentUrl = (url: string): string => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `${backendBase}${url}`;
  };

  const handleAttachmentClick = (url: string) => {
    window.open(resolveAttachmentUrl(url), '_blank', 'noopener,noreferrer');
  };

  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setImageError('Поддерживаются только JPG, PNG или WEBP');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setImageError('Размер изображения не должен превышать 5 МБ');
      event.target.value = '';
      return;
    }

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
    setImageError(null);
  };

  const clearSelectedImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setSelectedImage(null);
    setImagePreview(null);
    setImageError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendText = async () => {
    if (!inputValue.trim() || sending) return;

    const messageText = inputValue.trim();
    setInputValue('');
    setSending(true);

    try {
      await onSendMessage(messageText);
    } catch (error) {
      setInputValue(messageText);
      throw error;
    } finally {
      setSending(false);
    }
  };

  const handleSendSelectedImage = async () => {
    if (!selectedImage || sending) return;
    setSending(true);
    setImageError(null);
    const caption = inputValue.trim();

    try {
      await onSendImage(selectedImage, caption || undefined);
      setInputValue('');
      clearSelectedImage();
    } catch (error: any) {
      const apiError = error?.response?.data?.error || error?.message || 'Не удалось отправить изображение';
      setImageError(apiError);
      throw error;
    } finally {
      setSending(false);
    }
  };

  const handleSend = async () => {
    if (selectedImage) {
      await handleSendSelectedImage();
    } else {
      await handleSendText();
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const isSendDisabled = sending || (!selectedImage && !inputValue.trim());
  const inputPlaceholder = selectedImage
    ? 'Добавьте подпись к изображению (необязательно)...'
    : 'Введите сообщение...';

  return (
    <div className="flex flex-col h-full">
      {product && (
        <div className="p-3 bg-tg-secondary-bg border-b border-tg-hint">
          <div className="text-xs text-tg-hint mb-1">Интересующий товар:</div>
          <div className="text-sm font-bold text-tg-text">📦 {product.title}</div>
          {product.price && <div className="text-xs text-tg-hint mt-1">💰 {product.price}</div>}
        </div>
      )}

      {selectedImage && (
        <div className="px-3 pt-3">
          <div className="rounded-xl border border-dashed border-tg-hint bg-tg-secondary-bg/40 p-3">
            <div className="flex items-center justify-between text-xs text-tg-hint mb-2">
              <span>
                Изображение: {selectedImage.name} ({Math.round(selectedImage.size / 1024)} КБ)
              </span>
              <button
                type="button"
                onClick={clearSelectedImage}
                disabled={sending}
                className="text-tg-link border-none bg-transparent cursor-pointer text-xs disabled:opacity-60"
              >
                Отменить
              </button>
            </div>
            {imagePreview && (
              <img
                src={imagePreview}
                alt="Предпросмотр"
                className="max-h-48 w-full object-cover rounded-lg"
              />
            )}
            <div className="text-[11px] text-tg-hint mt-2">
              {sending ? 'Отправляем изображение...' : 'Подпись возьмётся из поля ввода ниже.'}
            </div>
          </div>
        </div>
      )}

      {imageError && (
        <div className="px-3 pt-2 text-[12px] text-red-400">
          {imageError}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {loading && messages.length === 0 ? (
          <div className="text-center text-tg-hint">Загрузка сообщений...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-tg-hint">Нет сообщений</div>
        ) : (
          messages.map((message) => {
            const showText = !(message.attachmentType === 'image' && message.content === '[image]');
            return (
              <div
                key={message.id}
                className={clsx(
                  'flex flex-col gap-1',
                  message.direction === 'user_to_manager' ? 'items-start' : 'items-end',
                )}
              >
                <div
                  className={clsx(
                    'text-[11px] text-tg-hint px-1',
                    message.direction === 'user_to_manager' ? 'self-start' : 'self-end',
                  )}
                >
                  {getSenderName(message.direction)}
                </div>

                <div
                  className={clsx(
                    'flex w-full',
                    message.direction === 'user_to_manager' ? 'justify-start' : 'justify-end',
                  )}
                >
                  <div
                    className={clsx(
                      'max-w-[75%] min-w-0 px-3.5 py-2.5 rounded-xl shadow-sm overflow-hidden flex flex-col gap-2',
                      message.direction === 'user_to_manager'
                        ? 'bg-tg-secondary-bg text-tg-text'
                        : 'bg-tg-button text-white',
                    )}
                  >
                    {message.productTitle && (
                      <div
                        className={clsx(
                          'text-[11px] opacity-80 pb-1',
                          message.direction === 'user_to_manager'
                            ? 'border-b border-black/10'
                            : 'border-b border-white/30',
                        )}
                      >
                        📦 {message.productTitle}
                      </div>
                    )}

                    {message.attachmentType === 'image' && message.attachmentUrl && (
                      <div className="rounded-lg overflow-hidden bg-black/5">
                        <img
                          src={resolveAttachmentUrl(message.attachmentUrl)}
                          alt="Изображение из чата"
                          className="max-h-72 w-full object-cover cursor-zoom-in"
                          onClick={() => handleAttachmentClick(message.attachmentUrl!)}
                          loading="lazy"
                        />
                      </div>
                    )}

                    {showText && (
                      <div className="whitespace-normal break-words">
                        {message.content}
                      </div>
                    )}

                    <div className="text-[10px] opacity-70 text-right">
                      {formatTime(message.sentAt)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t border-tg-hint bg-tg-bg">
        <div className="flex gap-2 items-center">
          <button
            type="button"
            onClick={handleFileButtonClick}
            disabled={sending}
            className={clsx(
              'w-10 h-10 rounded-full border border-tg-hint bg-transparent text-lg flex items-center justify-center transition hover:bg-tg-secondary-bg',
              sending && 'opacity-50 cursor-not-allowed',
            )}
            title="Прикрепить изображение"
          >
            🖼
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(',')}
            className="hidden"
            onChange={handleFileChange}
          />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={inputPlaceholder}
            disabled={sending}
            className="flex-1 px-3.5 py-2.5 rounded-[20px] border border-tg-hint text-sm bg-tg-bg text-tg-text"
          />
          <button
            onClick={() => void handleSend()}
            disabled={isSendDisabled}
            className={clsx(
              'px-5 py-2.5 rounded-[20px] border-none text-sm font-bold text-white transition-colors',
              isSendDisabled
                ? 'bg-tg-hint cursor-not-allowed'
                : 'bg-tg-button cursor-pointer hover:opacity-90',
            )}
          >
            {sending ? '...' : selectedImage ? '⤴' : '→'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatView;

