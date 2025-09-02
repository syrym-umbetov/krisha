// app/api/parse-filters/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

interface ApartmentCard {
    id: string;
    uuid: string;
    title: string;
    price: string;
    area: string;
    floor: string;
    address: string;
    description: string;
    views: string;
    imageUrl: string;
    url: string;
    isUrgent: boolean;
    features: string[];
}

interface FilterParams {
    city: string;
    priceFrom: string;
    priceTo: string;
    rooms: string;
    page: number;
}

// Функция для извлечения изображения из карточки
function extractImageUrl(cardElement: cheerio.Cheerio<cheerio.Element>, $: cheerio.CheerioAPI): string {
    // Сначала пытаемся получить изображение из data-uuid (более надежный способ)
    const dataUuid = cardElement.attr('data-uuid');
    if (dataUuid) {
        // Строим URL изображения на основе UUID
        const firstTwoChars = dataUuid.substring(0, 2);
        const imageUrl = `https://alakcell-photos-kr.kcdn.kz/webp/${firstTwoChars}/${dataUuid}/1-400x300.webp`;
        return imageUrl;
    }

    // Ищем изображение в picture элементе
    const img = cardElement.find('picture img').first();
    if (img.length > 0) {
        let src = img.attr('src') || img.attr('data-src');
        if (src && src.includes('alakcell-photos-kr.kcdn.kz')) {
            return src.startsWith('http') ? src : `https:${src}`;
        }
    }

    // Альтернативный поиск изображений
    const imgAlt = cardElement.find('img').first();
    if (imgAlt.length > 0) {
        let src = imgAlt.attr('src') || imgAlt.attr('data-src');
        if (src && src.includes('alakcell-photos-kr.kcdn.kz')) {
            return src.startsWith('http') ? src : `https:${src}`;
        }
    }

    return '';
}

// Функция для извлечения особенностей квартиры
function extractFeatures(cardElement: cheerio.Cheerio<cheerio.Element>, $: cheerio.CheerioAPI): string[] {
    const features: string[] = [];

    // Ищем платные услуги (горячие, топ, срочно)
    cardElement.find('.paid-icon').each((i, element) => {
        const tooltip = $(element).find('.kr-tooltip__title').text().trim();
        if (tooltip) {
            features.push(tooltip);
        }
    });

    // Проверяем метки ипотеки, рассрочки, акций
    cardElement.find('.credit-badge').each((i, element) => {
        const badgeText = $(element).text().trim();
        if (badgeText && !features.includes(badgeText)) {
            features.push(badgeText);
        }
    });

    // Ищем метки "В залоге", "Новостройка"
    const mortgageLabel = cardElement.find('.a-is-mortgaged').text().trim();
    if (mortgageLabel && !features.includes(mortgageLabel)) {
        features.push(mortgageLabel);
    }

    const complexLabel = cardElement.find('.a-card__complex-label').text().trim();
    if (complexLabel && !features.includes(complexLabel)) {
        features.push(complexLabel);
    }

    return features;
}

// Функция для парсинга пагинации
function extractPaginationInfo($: cheerio.CheerioAPI) {
    let totalPages = 1;
    let hasNextPage = false;

    // Ищем пагинатор
    const paginator = $('.paginator, .pagination, nav.paginator');

    if (paginator.length > 0) {
        console.log('Найден пагинатор');

        // Получаем все номера страниц из кнопок пагинатора
        const pageNumbers: number[] = [];

        // Ищем все кнопки с data-page атрибутом или номерами страниц в тексте
        paginator.find('.paginator__btn, .pagination__btn, .page-btn, a[data-page]').each((i, element) => {
            const $btn = $(element);

            // Сначала пробуем получить из data-page
            const dataPage = $btn.attr('data-page');
            if (dataPage) {
                const pageNum = parseInt(dataPage);
                if (!isNaN(pageNum) && pageNum > 0) {
                    pageNumbers.push(pageNum);
                    console.log(`Найдена страница из data-page: ${pageNum}`);
                }
            } else {
                // Если нет data-page, пробуем извлечь из текста кнопки
                const pageText = $btn.text().trim();
                const pageNum = parseInt(pageText);
                if (!isNaN(pageNum) && pageNum > 0) {
                    pageNumbers.push(pageNum);
                    console.log(`Найдена страница из текста: ${pageNum}`);
                }
            }
        });

        // Также ищем номера страниц в href атрибутах
        paginator.find('a[href*="page="]').each((i, element) => {
            const href = $(element).attr('href') || '';
            const pageMatch = href.match(/page=(\d+)/);
            if (pageMatch) {
                const pageNum = parseInt(pageMatch[1]);
                if (!isNaN(pageNum) && pageNum > 0) {
                    pageNumbers.push(pageNum);
                    console.log(`Найдена страница из href: ${pageNum}`);
                }
            }
        });

        // Находим максимальный номер страницы
        if (pageNumbers.length > 0) {
            totalPages = Math.max(...pageNumbers);
            console.log(`Найденные номера страниц: [${pageNumbers.sort((a, b) => a - b).join(', ')}]`);
            console.log(`Максимальная страница: ${totalPages}`);
        }

        // Проверяем есть ли кнопка "Дальше" или "Next"
        const nextBtn = paginator.find('.paginator__btn--next, .pagination__btn--next, .next, .page-next, [class*="next"]');
        hasNextPage = nextBtn.length > 0;

        console.log(`Есть кнопка "Дальше": ${hasNextPage}`);
    } else {
        console.log('Пагинатор не найден, ищем альтернативные селекторы');

        // Если пагинатора нет, ищем альтернативные селекторы
        const altSelectors = [
            '.pagination .next',
            '.pager .next',
            'a[rel="next"]',
            '.page-next',
            '.next-page'
        ];

        for (const selector of altSelectors) {
            if ($(selector).length > 0) {
                hasNextPage = true;
                console.log(`Найдена кнопка "Дальше" через селектор: ${selector}`);
                break;
            }
        }

        // Ищем номера страниц в ссылках по всей странице
        const pageLinks = $('a[href*="page="]');
        const pageNumbers: number[] = [];

        pageLinks.each((i, element) => {
            const href = $(element).attr('href') || '';
            const pageMatch = href.match(/page=(\d+)/);
            if (pageMatch) {
                const pageNum = parseInt(pageMatch[1]);
                if (!isNaN(pageNum)) {
                    pageNumbers.push(pageNum);
                }
            }
        });

        if (pageNumbers.length > 0) {
            totalPages = Math.max(...pageNumbers);
            console.log(`Найдены номера страниц через ссылки: [${pageNumbers.sort((a, b) => a - b).join(', ')}]`);
            console.log(`Максимальная страница: ${totalPages}`);
        }
    }

    return { totalPages, hasNextPage };
}

// Функция для парсинга одной карточки объявления
function parseApartmentCard(cardElement: cheerio.Cheerio<cheerio.Element>, $: cheerio.CheerioAPI): ApartmentCard | null {
    try {
        const id = cardElement.attr('data-id');
        const uuid = cardElement.attr('data-uuid');

        if (!id || !uuid) {
            return null;
        }

        // Заголовок
        const title = cardElement.find('.a-card__title').text().trim();

        // Цена
        const price = cardElement.find('.a-card__price').text().trim();

        // URL объявления
        const url = cardElement.find('.a-card__title').attr('href') || '';

        // Адрес
        const address = cardElement.find('.a-card__subtitle').text().trim();

        // Описание
        const description = cardElement.find('.a-card__text-preview').text().trim();

        // Количество просмотров
        const views = cardElement.find('.a-view-count').text().trim() || '0';

        // Изображение
        const imageUrl = extractImageUrl(cardElement, $);

        // Проверяем на срочность
        const isUrgent = cardElement.hasClass('is-urgent') || cardElement.find('.a-card__label').text().includes('Срочно');

        // Особенности
        const features = extractFeatures(cardElement, $);

        // Извлекаем площадь и этаж из заголовка
        const titleMatch = title.match(/(\d+(?:\.\d+)?)\s*м².*?(\d+\/\d+)\s*этаж/);
        const area = titleMatch ? `${titleMatch[1]} м²` : '';
        const floor = titleMatch ? titleMatch[2] : '';

        return {
            id,
            uuid,
            title,
            price,
            area,
            floor,
            address,
            description,
            views,
            imageUrl,
            url,
            isUrgent,
            features
        };
    } catch (error) {
        console.error('Ошибка парсинга карточки:', error);
        return null;
    }
}

// Функция для построения URL с фильтрами
function buildFilterUrl(filters: FilterParams): string {
    const baseUrl = 'https://krisha.kz/prodazha/kvartiry';
    const cityUrl = `${baseUrl}/${filters.city}/`;

    const params = new URLSearchParams();

    if (filters.rooms) {
        params.append('das[live.rooms]', filters.rooms);
    }

    if (filters.priceFrom) {
        params.append('das[price][from]', filters.priceFrom);
    }

    if (filters.priceTo) {
        params.append('das[price][to]', filters.priceTo);
    }

    // Добавляем пагинацию
    if (filters.page && filters.page > 1) {
        params.append('page', filters.page.toString());
    }

    return `${cityUrl}?${params.toString()}`;
}

export async function POST(request: NextRequest) {
    try {
        const filters: FilterParams = await request.json();

        // Валидация
        if (!filters.city) {
            return NextResponse.json(
                { error: 'Город обязателен' },
                { status: 400 }
            );
        }

        const url = buildFilterUrl(filters);
        console.log(`Парсинг фильтров: ${url}`);

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

        const apartments: ApartmentCard[] = [];

        // Парсим все карточки объявлений
        $('.a-card').each((i, element) => {
            const $card = $(element);

            // Пропускаем рекламные блоки
            if ($card.hasClass('ddl_campaign') || $card.find('.adfox').length > 0) {
                return;
            }

            const apartment = parseApartmentCard($card, $);
            if (apartment && apartment.title && apartment.price) {
                apartments.push(apartment);
            }
        });

        // Извлекаем информацию о пагинации
        const paginationInfo = extractPaginationInfo($);

        // Пытаемся найти общее количество найденных объявлений из заголовка
        let totalFound = 0;

        // Ищем текст "Найдено X объявлений" в разных местах
        const searchSubtitle = $('.a-search-subtitle, .search-results-nb').text();
        console.log('Search subtitle text:', searchSubtitle);

        const totalMatchFromSubtitle = searchSubtitle.match(/Найдено\s+(\d+(?:\s+\d+)*)\s+объявлени/i);
        if (totalMatchFromSubtitle) {
            // Убираем пробелы из числа (например "9 778" -> "9778")
            const cleanNumber = totalMatchFromSubtitle[1].replace(/\s+/g, '');
            totalFound = parseInt(cleanNumber);
            console.log(`Найдено общее количество из заголовка: ${totalFound}`);
        }

        // Если не нашли в заголовке, ищем в других местах
        if (!totalFound) {
            let totalText = '';

            const countSelectors = [
                '.search-results-header',
                '.results-count',
                '.found-count',
                '.search-results__count',
                '.listing-header',
                'h1',
                '.search-summary',
                '.page-title'
            ];

            for (const selector of countSelectors) {
                const element = $(selector);
                if (element.length > 0) {
                    totalText += ' ' + element.text();
                }
            }

            // Также ищем в мета-данных и заголовке страницы
            totalText += ' ' + $('title').text();

            // Пытаемся извлечь число из всего найденного текста
            const totalMatches = totalText.match(/(\d+(?:\s+\d+)*)\s*(?:объявлени|результат|найден)/gi);

            if (totalMatches && totalMatches.length > 0) {
                // Берем самое большое число (обычно это общее количество)
                const numbers = totalMatches.map(match => {
                    const num = match.match(/(\d+(?:\s+\d+)*)/);
                    if (num) {
                        const cleanNumber = num[1].replace(/\s+/g, '');
                        return parseInt(cleanNumber);
                    }
                    return 0;
                });
                totalFound = Math.max(...numbers);
                console.log(`Найдено общее количество из альтернативного поиска: ${totalFound}`);
            }
        }

        // Если все еще не нашли счетчик, оцениваем на основе пагинации
        if (!totalFound && paginationInfo.totalPages > 1) {
            // Предполагаем 20 объявлений на странице (стандарт Krisha.kz)
            totalFound = Math.max(paginationInfo.totalPages * 20, apartments.length);
            console.log(`Оценочное общее количество на основе пагинации: ${totalFound}`);
        } else if (!totalFound) {
            totalFound = apartments.length;
        }

        console.log(`Найдено объявлений: ${apartments.length}`);
        console.log(`Общий счетчик: ${totalFound}`);
        console.log(`Всего страниц: ${paginationInfo.totalPages}`);
        console.log(`Есть следующая страница: ${paginationInfo.hasNextPage}`);

        // Очистка данных
        apartments.forEach(apartment => {
            apartment.title = apartment.title.replace(/\s+/g, ' ').trim();
            apartment.price = apartment.price.replace(/\s+/g, ' ').trim();
            apartment.address = apartment.address.replace(/\s+/g, ' ').trim();
            apartment.description = apartment.description.replace(/\s+/g, ' ').trim().substring(0, 200);
        });

        return NextResponse.json({
            apartments,
            total: totalFound,
            totalPages: paginationInfo.totalPages,
            currentPage: filters.page,
            hasNextPage: paginationInfo.hasNextPage,
            url,
            filters
        });

    } catch (error) {
        console.error('Ошибка парсинга фильтров:', error);

        return NextResponse.json(
            {
                error: 'Ошибка при парсинге страницы. Проверьте параметры и попробуйте позже.',
                details: error instanceof Error ? error.message : 'Неизвестная ошибка'
            },
            { status: 500 }
        );
    }
}

// GET метод для тестирования
export async function GET() {
    return NextResponse.json({
        message: 'Krisha.kz Filters Parser API готов к работе',
        usage: 'POST /api/parse-filters with { city, priceFrom, priceTo, rooms, page }',
        example: {
            city: 'astana',
            priceFrom: '10000000',
            priceTo: '40000000',
            rooms: '1',
            page: 1
        },
        response: {
            apartments: 'Array<ApartmentCard>',
            total: 'number - общее количество найденных объявлений',
            totalPages: 'number - общее количество страниц',
            currentPage: 'number - текущая страница',
            hasNextPage: 'boolean - есть ли следующая страница',
            url: 'string - сформированный URL для парсинга',
            filters: 'FilterParams - использованные параметры фильтрации'
        },
        version: '1.2.0'
    });
}