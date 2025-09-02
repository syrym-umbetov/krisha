'use client'
import { useEffect, useState } from 'react';
import { Search, Home, MapPin, Calendar, Ruler, Building, Banknote, Info, Loader, Download, Image as ImageIcon } from 'lucide-react';
import { convertImageUrl, downloadImage, downloadAllImages } from './lib/image-utils'; // Правильный импорт

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
    percentageDifference: string;
  };
  images: string[];
  imageVariants?: {
    thumb: string;
    medium: string;
    large: string;
    full: string;
  };
  contact?: {
    name: string;
    type: string;
    phone: string;
  };
  views?: string;
}

export default function KrishaParserLanding() {
  const [url, setUrl] = useState('');
  const [apartmentData, setApartmentData] = useState<ApartmentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const parseApartment = async () => {
    if (!url.trim()) {
      setError('Введите ссылку на объявление');
      return;
    }

    if (!url.includes('krisha.kz')) {
      setError('Ссылка должна быть с сайта krisha.kz');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('Отправляем запрос на парсинг:', url);
      
      const response = await fetch('/api/parse-krisha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      console.log('Ответ от API:', response.status, response.statusText);

      const result = await response.json();
      console.log('Данные от API:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка при парсинге');
      }

      if (result.data) {
        setApartmentData(result.data);
        console.log('Данные установлены:', {
          title: result.data.title,
          imagesCount: result.data.images?.length || 0,
          firstImageUrl: result.data.images?.[0]
        });
      }
    } catch (err) {
      console.error('Parsing error:', err);
      setError(err instanceof Error ? err.message : 'Ошибка при парсинге объявления');
    } finally {
      setLoading(false);
    }
  };

  


  const [validatedImages, setValidatedImages] = useState<string[]>([]);
  const [imageValidationComplete, setImageValidationComplete] = useState(false);

  useEffect(() => {
    if (apartmentData) {
      console.log('🏠 ApartmentData получена:', {
        hasImages: !!apartmentData.images,
        imagesCount: apartmentData.images?.length,
        firstImage: apartmentData.images?.[0],
        validatedCount: validatedImages.length
      });
    }
  }, [apartmentData, validatedImages]);

    useEffect(() => {
      if (apartmentData?.images && apartmentData.images.length > 0) {
        validateImagesOnClient(apartmentData.images);
      }
    }, [apartmentData]);

    const validateImagesOnClient = async (imageUrls: string[]) => {
      const valid: string[] = [];
      console.log(`Начинаем валидацию ${imageUrls.length} изображений...`);
      
      for (let i = 0; i < imageUrls.length; i++) {
        const url = imageUrls[i];
        console.log(`Проверяем изображение ${i + 1}/${imageUrls.length}: ${url}`);
        
        try {
          await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
              console.log(`✓ Изображение ${i + 1} загружено`);
              resolve(true);
            };
            img.onerror = () => {
              console.log(`✗ Изображение ${i + 1} недоступно`);
              reject(new Error('Image load failed'));
            };
            img.src = convertImageUrl(url, 'thumb');
            
            // Timeout 5 секунд
            setTimeout(() => {
              console.log(`⏰ Timeout для изображения ${i + 1}`);
              reject(new Error('Timeout'));
            }, 5000);
          });
          
          valid.push(url);
          
          // Останавливаемся на 10 валидных изображениях для ускорения
          if (valid.length >= 10) break;
          
        } catch (error) {
          // Изображение недоступно, пропускаем
        }
      }
      
      console.log(`Валидация завершена: ${valid.length} из ${imageUrls.length} изображений доступны`);
      setValidatedImages(valid);
      setImageValidationComplete(true);
    };
  

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-green-600 rounded-lg flex items-center justify-center">
              <Home className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Парсер Krisha.kz</h1>
              <p className="text-sm text-gray-600">Анализ объявлений недвижимости</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Search Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Анализ объявлений с Krisha.kz
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Вставьте ссылку на объявление и получите полную информацию о квартире, 
              включая сравнение цен и детали объекта
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="flex space-x-4">
              <div className="flex-1">
                <input
                  type="url"
                  placeholder="https://krisha.kz/a/show/761450233"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none text-lg"
                  disabled={loading}
                />
              </div>
              <button
                onClick={parseApartment}
                disabled={loading}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-xl hover:from-blue-700 hover:to-green-700 transition-all duration-200 flex items-center space-x-2 font-semibold disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Парсинг...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    <span>Анализировать</span>
                  </>
                )}
              </button>
            </div>
            
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-center">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Results Section */}
        {apartmentData && (
          <div className="space-y-8">
            {/* Main Info */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-green-600 text-white p-6">
                <h2 className="text-2xl font-bold">{apartmentData.title}</h2>
                <div className="flex items-center space-x-4 mt-2">
                  <span className="text-3xl font-bold">{apartmentData.price}</span>
                  <span className="text-lg opacity-90">({apartmentData.pricePerMeter}/м²)</span>
                </div>
              </div>
              
              <div className="p-6 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Расположение</p>
                    <p className="font-semibold">{apartmentData.city}, {apartmentData.district}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Building className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Жилой комплекс</p>
                    <p className="font-semibold">{apartmentData.complex}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-600">Год постройки</p>
                    <p className="font-semibold">{apartmentData.yearBuilt}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Ruler className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="text-sm text-gray-600">Площадь</p>
                    <p className="font-semibold">{apartmentData.area}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Home className="w-5 h-5 text-indigo-600" />
                  <div>
                    <p className="text-sm text-gray-600">Комнаты</p>
                    <p className="font-semibold">{apartmentData.rooms}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Info className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="text-sm text-gray-600">Высота потолков</p>
                    <p className="font-semibold">{apartmentData.ceilingHeight}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Images Gallery - ПЕРЕМЕЩЕНО ВЫШЕ для лучшей видимости */}
            {apartmentData.images && apartmentData.images.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                    <ImageIcon className="w-6 h-6 text-blue-600" />
                    <span>Фотографии ({apartmentData.images.length})</span>
                  </h3>
                  <button
                    onClick={() => downloadAllImages(apartmentData.images, apartmentData.title)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Скачать все</span>
                  </button>
                </div>
                <ImageGallery images={validatedImages} title={apartmentData.title} />
              </div>
            )}

            {/* Market Analysis */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
                <Banknote className="w-6 h-6 text-green-600" />
                <span>Анализ цены</span>
              </h3>
              
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-blue-50 rounded-xl">
                  <p className="text-sm text-gray-600 mb-1">Цена этого объявления</p>
                  <p className="text-2xl font-bold text-blue-600">{apartmentData.marketPrice.thisListing}</p>
                </div>
                
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-600 mb-1">Похожие в районе</p>
                  <p className="text-2xl font-bold text-gray-600">{apartmentData.marketPrice.similarInAstana}</p>
                </div>
                
                <div className="text-center p-4 bg-green-50 rounded-xl">
                  <p className="text-sm text-gray-600 mb-1">Выгода</p>
                  <p className="text-2xl font-bold text-green-600">{apartmentData.marketPrice.percentageDifference}</p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Описание</h3>
              <p className="text-gray-700 leading-relaxed">{apartmentData.description}</p>
            </div>

            {/* Features */}
            {apartmentData.features.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Особенности</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {apartmentData.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
                      <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-gray-400">© 2025 Парсер Krisha.kz. Анализ недвижимости Казахстана.</p>
        </div>
      </footer>
    </div>
  );
}

// Компонент галереи изображений
function ImageGallery({ images, title }: { images: string[]; title: string }) {
  const [currentImage, setCurrentImage] = useState(0);
  const [imageError, setImageError] = useState(false);

  if (!images || images.length === 0) {
    return (
      <div className="bg-gray-100 rounded-xl p-8 text-center">
        <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-500">Изображения не найдены</p>
      </div>
    );
  }

  const handleImageError = () => {
    setImageError(true);
    // Пытаемся загрузить в среднем размере
    const mediumSrc = convertImageUrl(images[currentImage], 'medium');
    const imgElement = document.querySelector('.main-gallery-image') as HTMLImageElement;
    if (imgElement && imgElement.src !== mediumSrc) {
      imgElement.src = mediumSrc;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="relative">
        {/* Основное изображение */}
        <img 
          src={convertImageUrl(images[currentImage], 'large')}
          alt={`Фото ${currentImage + 1} - ${title}`}
          className="main-gallery-image w-full h-96 object-cover"
          onError={handleImageError}
          onLoad={() => setImageError(false)}
        />
        
        {/* Счетчик и кнопка скачивания */}
        <div className="absolute top-4 right-4 flex items-center space-x-2">
          <div className="bg-black bg-opacity-50 text-white px-3 py-1 rounded">
            {currentImage + 1} / {images.length}
          </div>
          <button
            onClick={() => downloadImage(images[currentImage], `${title}_photo_${currentImage + 1}.jpg`)}
            className="bg-black bg-opacity-50 text-white p-2 rounded hover:bg-opacity-70 transition-opacity"
            title="Скачать это изображение"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>

        {/* Навигация */}
        {images.length > 1 && (
          <>
            <button 
              onClick={() => setCurrentImage(prev => prev > 0 ? prev - 1 : images.length - 1)}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white w-10 h-10 rounded-full hover:bg-opacity-70 transition-opacity"
            >
              ‹
            </button>
            <button 
              onClick={() => setCurrentImage(prev => prev < images.length - 1 ? prev + 1 : 0)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white w-10 h-10 rounded-full hover:bg-opacity-70 transition-opacity"
            >
              ›
            </button>
          </>
        )}

        {/* Индикатор ошибки */}
        {imageError && (
          <div className="absolute bottom-4 left-4 bg-yellow-500 bg-opacity-90 text-white px-3 py-1 rounded text-sm">
            Загружается резервное изображение...
          </div>
        )}
      </div>

      {/* Превью */}
      {images.length > 1 && (
        <div className="p-4 flex gap-2 overflow-x-auto">
          {images.map((image, index) => (
            <img
              key={index}
              src={convertImageUrl(image, 'thumb')}
              alt={`Превью ${index + 1}`}
              className={`w-20 h-16 object-cover rounded cursor-pointer border-2 flex-shrink-0 ${
                index === currentImage ? 'border-blue-500' : 'border-gray-200'
              }`}
              onClick={() => setCurrentImage(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}