// app/api/parse-krisha/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

interface ApartmentData {
  title: string;
  price: string;
  pricePerMeter: string;
  city: string;
  district: string;
  buildingType: string;
  complex: string;
  yearBuilt: string;
  area: string;
  rooms: string;
  floor: string;
  ceilingHeight: string;
  description: string;
  features: string[];
  location: string;
  infrastructure: string[];
  architecture: string[];
  landscaping: string;
  marketPrice: {
    thisListing: string;
    similarInAstana: string;
    similarInCity?: string;
    percentageDifference: string;
  };
  contact?: {
    name: string;
    type: string;
    phone: string;
  };
  views?: string;
  images: string[];
  imageVariants?: {
    thumb: string;
    medium: string;
    large: string;
    full: string;
  };
}

// Функции для работы с изображениями с использованием UUID
function extractUuidFromUrl(url: string): string | null {
  const match = url.match(/\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\//i);
  return match ? match[1] : null;
}

function extractPrefixFromUrl(url: string): string | null {
  const match = url.match(/\/webp\/([^\/]+)\//);
  return match ? match[1] : null;
}

function convertImageUrl(url: string, size: 'thumb' | 'medium' | 'large' | 'full' = 'full'): string {
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

function generateImageUrl(prefix: string, uuid: string, imageNumber: number, size: string = 'full'): string {
  return `https://alaps-photos-kr.kcdn.kz/webp/${prefix}/${uuid}/${imageNumber}-${size}.webp`;
}

function parseImages($: cheerio.CheerioAPI): string[] {
    const images: string[] = [];
    const imageNumbers = new Set<number>();
  
    console.log('🖼️ Начинаем парсинг изображений с использованием UUID...');
  
    // ОТЛАДКА HEAD ЭЛЕМЕНТА
    console.log('🔍 Проверяем парсинг HEAD:');
    console.log('  - Найдено head элементов:', $('head').length);
    console.log('  - Всего мета-тегов:', $('meta').length);
    console.log('  - Мета-теги в head:', $('head meta').length);
    
    // Проверяем разные способы поиска og:image
    const ogImageProperty = $('meta[property="og:image"]').attr('content');
    const ogImageName = $('meta[name="og:image"]').attr('content');
    const ogImageInHead = $('head meta[property="og:image"]').attr('content');
    
    console.log('📸 og:image (property):', ogImageProperty || 'НЕ НАЙДЕН');
    console.log('📸 og:image (name):', ogImageName || 'НЕ НАЙДЕН');
    console.log('📸 og:image в head:', ogImageInHead || 'НЕ НАЙДЕН');
  
    // Попробуем найти любой мета-тег с изображением из alaps-photos-kr.kcdn.kz
    let foundImageUrl = null;
    $('meta').each((i, element) => {
      const content = $(element).attr('content');
      if (content && content.includes('alaps-photos-kr.kcdn.kz')) {
        const property = $(element).attr('property') || $(element).attr('name');
        console.log(`📸 Найден мета-тег с изображением: ${property} = ${content}`);
        if (!foundImageUrl) foundImageUrl = content;
      }
    });
  
    // Также попробуем поиск в title и других местах
    const title = $('title').text();
    console.log('📄 Title страницы:', title);
  
    // Ищем изображения в самом HTML (на случай если мета-тег недоступен)
    console.log('🔍 Ищем изображения прямо в HTML:');
    const directImages = [];
    $('img').each((i, element) => {
      const src = $(element).attr('src') || $(element).attr('data-src');
      if (src && src.includes('alaps-photos-kr.kcdn.kz')) {
        directImages.push(src);
      }
    });
    console.log(`  - Найдено img тегов с alaps-photos: ${directImages.length}`);
    if (directImages.length > 0) {
      console.log(`  - Первые 3: ${directImages.slice(0, 3)}`);
    }
  
    // Используем найденный URL (приоритет: og:image, потом любой другой)
    const ogImageUrl = ogImageProperty || ogImageName || ogImageInHead || foundImageUrl;
  
    
    if (!ogImageUrl) {
      console.log('og:image не найден, используем старый метод парсинга');
      return parseImagesOldMethod($);
    }
  
    console.log('Найден og:image:', ogImageUrl);
  
    const uuid = extractUuidFromUrl(ogImageUrl);
    const prefix = extractPrefixFromUrl(ogImageUrl);
  
    if (!uuid || !prefix) {
      console.log('Не удалось извлечь UUID или prefix из og:image, используем старый метод');
      return parseImagesOldMethod($);
    }
  
    console.log('Извлеченные данные:', { uuid, prefix });
  
    // Сначала собираем номера из HTML
    const selectors = [
      '.gallery__small-item img',
      '.gallery__main img', 
      '.gallery__small-item',
      'picture source',
      '[data-photo-url]'
    ];
  
    selectors.forEach(selector => {
      $(selector).each((i, element) => {
        let src = $(element).attr('src') || 
                  $(element).attr('data-src') || 
                  $(element).attr('data-photo-url');
        
        if (!src && $(element).attr('srcset')) {
          const srcset = $(element).attr('srcset') || '';
          src = srcset.split(',')[0].trim().split(' ')[0];
        }
  
        if (src && src.includes(uuid)) {
          const numberMatch = src.match(/\/(\d+)-/);
          if (numberMatch) {
            const imageNumber = parseInt(numberMatch[1]);
            imageNumbers.add(imageNumber);
            console.log(`Найден номер изображения: ${imageNumber}`);
          }
        }
      });
    });
  
    // ИЗМЕНЕНО: добавляем только разумное количество изображений
    if (imageNumbers.size === 0) {
      console.log('Номера не найдены в HTML, добавляем стандартные 1-15');
      for (let i = 1; i <= 15; i++) {
        imageNumbers.add(i);
      }
    }
  
    // Генерируем URL
    const sortedNumbers = Array.from(imageNumbers).sort((a, b) => a - b);
    
    for (const imageNumber of sortedNumbers) {
      const fullUrl = generateImageUrl(prefix, uuid, imageNumber, 'full');
      images.push(fullUrl);
    }
  
    console.log(`Сгенерировано ${images.length} URL изображений для UUID: ${uuid}`);
    
    return images;
  }
// Запасной метод парсинга (если UUID не найден)
function parseImagesOldMethod($: cheerio.CheerioAPI): string[] {
  const images: string[] = [];
  const imageUrls = new Set<string>();

  console.log('Используем старый метод парсинга изображений...');

  const selectors = ['.gallery__small-item img', '.gallery__main img', 'picture source'];

  selectors.forEach(selector => {
    $(selector).each((i, element) => {
      let src = $(element).attr('src') || $(element).attr('data-src');
      
      if (!src && $(element).attr('srcset')) {
        const srcset = $(element).attr('srcset') || '';
        src = srcset.split(',')[0].trim().split(' ')[0];
      }

      if (src && src.includes('alaps-photos-kr.kcdn.kz')) {
        const fullSrc = src.startsWith('http') ? src : `https:${src}`;
        imageUrls.add(fullSrc);
      }
    });
  });

  $('.gallery__small-item[data-photo-url]').each((i, element) => {
    const photoUrl = $(element).attr('data-photo-url');
    if (photoUrl && photoUrl.includes('alaps-photos-kr.kcdn.kz')) {
      const fullSrc = photoUrl.startsWith('http') ? photoUrl : `https:${photoUrl}`;
      imageUrls.add(fullSrc);
    }
  });

  Array.from(imageUrls).forEach(url => {
    const fullUrl = convertImageUrl(url, 'full');
    if (!images.includes(fullUrl)) {
      images.push(fullUrl);
    }
  });

  return images.sort((a, b) => {
    const numA = extractImageNumber(a);
    const numB = extractImageNumber(b);
    return numA - numB;
  });
}

function extractImageNumber(url: string): number {
  const match = url.match(/\/(\d+)-/);
  return match ? parseInt(match[1]) : 999;
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || !url.includes('krisha.kz')) {
      return NextResponse.json(
        { error: 'Неверная ссылка на krisha.kz' },
        { status: 400 }
      );
    }

    console.log(`Парсинг URL: ${url}`);

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    };

    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Инициализируем объект данных
    const apartmentData: ApartmentData = {
      title: '',
      price: '',
      pricePerMeter: '',
      city: '',
      district: '',
      buildingType: '',
      complex: '',
      yearBuilt: '',
      area: '',
      rooms: '',
      floor: '',
      ceilingHeight: '',
      description: '',
      features: [],
      location: '',
      infrastructure: [],
      architecture: [],
      landscaping: '',
      images: [], // Инициализируем пустым массивом
      marketPrice: {
        thisListing: '',
        similarInAstana: '',
        percentageDifference: ''
      }
    };

    // Заголовок
    apartmentData.title = $('.offer__advert-title h1').text().trim() || 
                          $('.offer__advert-title').text().trim();

    // Цена
    apartmentData.price = $('.offer__price').text().replace(/\s+/g, ' ').trim();

    // Извлекаем город и район из локации
    $('.offer__info-item').each((i, element) => {
      const title = $(element).find('.offer__info-title').text().trim().toLowerCase();
      const value = $(element).find('.offer__advert-short-info').text().trim();

      if (title.includes('город')) {
        if (value.includes(',')) {
          const parts = value.split(',');
          apartmentData.city = parts[0].trim();
          apartmentData.district = parts[1].trim();
        } else {
          apartmentData.city = value;
        }
      } else if (title.includes('жилой комплекс')) {
        apartmentData.complex = $(element).find('.offer__advert-short-info a').text().trim() || value;
      } else if (title.includes('год постройки')) {
        apartmentData.yearBuilt = value;
      } else if (title.includes('этаж')) {
        apartmentData.floor = value;
      } else if (title.includes('площадь')) {
        apartmentData.area = value;
      } else if (title.includes('балкон')) {
        apartmentData.features.push(`Балкон: ${value}`);
      }
    });

    // Дополнительные параметры
    $('.offer__parameters dl').each((i, element) => {
      const key = $(element).find('dt').text().trim();
      const value = $(element).find('dd').text().trim();

      if (key.includes('Высота потолков')) {
        apartmentData.ceilingHeight = value;
      } else if (key.includes('Балкон остеклён')) {
        apartmentData.features.push(`Балкон остеклён: ${value}`);
      } else if (key.includes('Дверь')) {
        apartmentData.features.push(`Дверь: ${value}`);
      } else if (key.includes('Интернет')) {
        apartmentData.features.push(`Интернет: ${value}`);
      } else if (key.includes('Парковка')) {
        apartmentData.features.push(`Парковка: ${value}`);
      } else if (key.includes('Квартира меблирована')) {
        apartmentData.features.push(`Меблирована: ${value}`);
      } else if (key.includes('Пол')) {
        apartmentData.features.push(`Пол: ${value}`);
      } else if (key.includes('Безопасность')) {
        apartmentData.features.push(`Безопасность: ${value}`);
      }
    });

    // Количество комнат из заголовка
    const titleMatch = apartmentData.title.match(/(\d+)-комнатная/);
    if (titleMatch) {
      apartmentData.rooms = `${titleMatch[1]} комнаты`;
    }

    // Площадь из заголовка если не найдена
    if (!apartmentData.area) {
      const areaMatch = apartmentData.title.match(/(\d+(?:\.\d+)?)\s*м²/);
      if (areaMatch) {
        apartmentData.area = `${areaMatch[1]} м²`;
      }
    }

    // Описание
    apartmentData.description = $('.js-description').text().trim() || 
                               $('.offer__description .text').text().trim();

    // Специальные метки
    $('.paid-labels__item').each((i, element) => {
      const label = $(element).text().trim();
      if (label) {
        apartmentData.features.push(label);
      }
    });

    // ИЗОБРАЖЕНИЯ - ТОЛЬКО ОДИН РАЗ!
    apartmentData.images = parseImages($);

    // Варианты размеров для первого изображения (после парсинга)
    if (apartmentData.images.length > 0) {
      apartmentData.imageVariants = {
        thumb: convertImageUrl(apartmentData.images[0], 'thumb'),
        medium: convertImageUrl(apartmentData.images[0], 'medium'),
        large: convertImageUrl(apartmentData.images[0], 'large'),
        full: convertImageUrl(apartmentData.images[0], 'full')
      };
    }

    // Аналитика цен
    apartmentData.marketPrice = {
      thisListing: $('.green-price').first().text().trim(),
      similarInAstana: $('.blue-price').first().text().trim() || $('.white-blue-price').first().text().trim(),
      percentageDifference: $('.a-analytics .text').text().trim()
    };

    // Цена за м²
    apartmentData.pricePerMeter = apartmentData.marketPrice.thisListing;

    // Контакты
    const contactName = $('.owners__name').text().trim();
    const contactType = $('.label-user-agent').text().trim();
    const contactPhone = $('.a-phones .phone').text().trim();
    
    if (contactName || contactType) {
      apartmentData.contact = {
        name: contactName,
        type: contactType,
        phone: contactPhone
      };
    }

    // Просмотры
    const viewsText = $('#a-nb-views strong').text().trim();
    if (viewsText) {
      apartmentData.views = viewsText;
    }

    // Проверка основных данных
    if (!apartmentData.title && !apartmentData.price) {
      return NextResponse.json(
        { error: 'Не удалось извлечь данные из объявления. Возможно, изменилась структура страницы или объявление удалено.' },
        { status: 422 }
      );
    }

    // Очистка данных
    Object.keys(apartmentData).forEach(key => {
      if (typeof (apartmentData as any)[key] === 'string') {
        (apartmentData as any)[key] = (apartmentData as any)[key].replace(/\s+/g, ' ').trim();
      }
    });

    console.log('Парсинг завершен успешно:', {
      title: apartmentData.title,
      price: apartmentData.price,
      city: apartmentData.city,
      images: apartmentData.images.length,
      features: apartmentData.features.length
    });

    return NextResponse.json({ data: apartmentData });

  } catch (error) {
    console.error('Ошибка парсинга:', error);
    
    return NextResponse.json(
      { 
        error: 'Ошибка при парсинге объявления. Проверьте ссылку и попробуйте позже.', 
        details: error instanceof Error ? error.message : 'Неизвестная ошибка'
      },
      { status: 500 }
    );
  }
}

// GET метод для тестирования
export async function GET() {
  return NextResponse.json({
    message: 'Krisha.kz Parser API готов к работе',
    usage: 'POST /api/parse-krisha with { url: "https://krisha.kz/..." }',
    version: '1.0.0'
  });
}
