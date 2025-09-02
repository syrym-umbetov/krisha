// lib/image-utils.ts
export function convertImageUrl(url: string, size: 'thumb' | 'medium' | 'large' | 'full' = 'full'): string {
    if (!url || !url.includes('alaps-photos-kr.kcdn.kz')) {
      return url;
    }
  
    const sizeMap = {
      'thumb': '120x90',     
      'medium': '280x175',   
      'large': '750x470',    
      'full': 'full'         
    };
  
    return url.replace(/-\d+x\d+\.(webp|jpg|jpeg)/, `-${sizeMap[size]}.$1`);
  }
  
  export function getImageVariants(baseUrl: string) {
    return {
      thumb: convertImageUrl(baseUrl, 'thumb'),
      medium: convertImageUrl(baseUrl, 'medium'), 
      large: convertImageUrl(baseUrl, 'large'),
      full: convertImageUrl(baseUrl, 'full')
    };
  }
  
  export function downloadImage(imageUrl: string, filename: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Создаем временную ссылку для скачивания
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = filename;
        link.target = '_blank'; // Открываем в новой вкладке на случай блокировки прямого скачивания
        
        // Добавляем в DOM, кликаем, удаляем
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }
  
  export async function downloadAllImages(images: string[], title: string): Promise<void> {
    for (let i = 0; i < images.length; i++) {
      const cleanTitle = title.replace(/[^a-zA-Z0-9а-яА-Я]/g, '_').substring(0, 50);
      const filename = `${cleanTitle}_photo_${i + 1}.jpg`;
      
      try {
        await downloadImage(images[i], filename);
        // Небольшая пауза между загрузками
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.error(`Ошибка загрузки изображения ${i + 1}:`, error);
      }
    }
  }