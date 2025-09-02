// app/filters/page.tsx
'use client'
import { useState } from 'react';
import { Search, Home, Filter, MapPin, Building, Eye, Download, Loader } from 'lucide-react';

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

interface ApiResponse {
    apartments: ApartmentCard[];
    total: number;
    totalPages: number;
    currentPage: number;
    hasNextPage: boolean;
    url: string;
    filters: FilterParams;
}

export default function FiltersPage() {
    const [filters, setFilters] = useState<FilterParams>({
        city: 'astana',
        priceFrom: '10000000',
        priceTo: '40000000',
        rooms: '1',
        page: 1
    });

    const [apartments, setApartments] = useState<ApartmentCard[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [totalFound, setTotalFound] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [hasNextPage, setHasNextPage] = useState(false);

    const cities = [
        { value: 'astana', label: 'Астана' },
        { value: 'almaty', label: 'Алматы' },
        { value: 'shymkent', label: 'Шымкент' },
    ];

    const roomOptions = [
        { value: '1', label: '1-комнатная' },
        { value: '2', label: '2-комнатная' },
        { value: '3', label: '3-комнатная' },
        { value: '4', label: '4-комнатная' },
    ];

    const handleSearch = async (resetPage: boolean = true) => {
        if (!filters.city) {
            setError('Выберите город');
            return;
        }

        setLoading(true);
        setError('');

        // При новом поиске сбрасываем на первую страницу
        const searchFilters = resetPage ? { ...filters, page: 1 } : filters;
        if (resetPage) {
            setCurrentPage(1);
            setFilters(prev => ({ ...prev, page: 1 }));
        }

        try {
            const response = await fetch('/api/parse-filters', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(searchFilters)
            });

            const result: ApiResponse = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Ошибка при парсинге');
            }

            setApartments(result.apartments);
            setTotalFound(result.total);
            setCurrentPage(result.currentPage || searchFilters.page);
            setTotalPages(result.totalPages || 1); // Используем totalPages из API
            setHasNextPage(result.hasNextPage || false);

            console.log(`Получено из API: всего объявлений=${result.total}, страниц=${result.totalPages}, текущая=${result.currentPage}`);

        } catch (err) {
            console.error('Search error:', err);
            setError(err instanceof Error ? err.message : 'Ошибка при поиске объявлений');
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (newPage: number) => {
        if (newPage < 1 || newPage > totalPages || loading) return;

        setFilters(prev => ({ ...prev, page: newPage }));
        setCurrentPage(newPage);

        // Запускаем поиск с новой страницей без сброса
        const newFilters = { ...filters, page: newPage };
        handleSearchWithFilters(newFilters);
    };

    const handleSearchWithFilters = async (searchFilters: FilterParams) => {
        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/parse-filters', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(searchFilters)
            });

            const result: ApiResponse = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Ошибка при парсинге');
            }

            setApartments(result.apartments);
            setTotalFound(result.total);
            setCurrentPage(result.currentPage || searchFilters.page);
            setTotalPages(result.totalPages || 1);
            setHasNextPage(result.hasNextPage || false);

            // Прокручиваем к началу результатов при смене страницы
            const resultsSection = document.querySelector('#results-section');
            if (resultsSection) {
                resultsSection.scrollIntoView({ behavior: 'smooth' });
            }

        } catch (err) {
            console.error('Search error:', err);
            setError(err instanceof Error ? err.message : 'Ошибка при поиске объявлений');
        } finally {
            setLoading(false);
        }
    };

    const downloadResults = () => {
        const dataStr = JSON.stringify(apartments, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

        const exportFileDefaultName = `krisha_filters_${filters.city}_page_${currentPage}_${Date.now()}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    };

    const formatPrice = (price: string) => {
        return price.replace(/\s+/g, ' ').trim();
    };

    // Генерируем диапазон страниц для отображения в пагинации
    const generatePageNumbers = () => {
        const pageNumbers: number[] = [];
        const maxVisiblePages = 7;

        if (totalPages <= maxVisiblePages) {
            // Если страниц мало, показываем все
            for (let i = 1; i <= totalPages; i++) {
                pageNumbers.push(i);
            }
        } else {
            // Показываем первую страницу
            pageNumbers.push(1);

            // Показываем страницы вокруг текущей
            const start = Math.max(2, currentPage - 2);
            const end = Math.min(totalPages - 1, currentPage + 2);

            if (start > 2) {
                pageNumbers.push(-1); // Символ "..."
            }

            for (let i = start; i <= end; i++) {
                if (i !== 1 && i !== totalPages) {
                    pageNumbers.push(i);
                }
            }

            if (end < totalPages - 1) {
                pageNumbers.push(-1); // Символ "..."
            }

            // Показываем последнюю страницу
            if (totalPages > 1) {
                pageNumbers.push(totalPages);
            }
        }

        return pageNumbers;
    };

    const pageNumbers = generatePageNumbers();

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                            <Filter className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Фильтры Krisha.kz</h1>
                            <p className="text-sm text-gray-600">Поиск и анализ объявлений по параметрам</p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Search Filters */}
                <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
                        <Search className="w-6 h-6 text-blue-600" />
                        <span>Параметры поиска</span>
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        {/* Город */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Город
                            </label>
                            <select
                                value={filters.city}
                                onChange={(e) => setFilters({...filters, city: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                disabled={loading}
                            >
                                {cities.map(city => (
                                    <option key={city.value} value={city.value}>
                                        {city.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Комнаты */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Количество комнат
                            </label>
                            <select
                                value={filters.rooms}
                                onChange={(e) => setFilters({...filters, rooms: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                disabled={loading}
                            >
                                {roomOptions.map(room => (
                                    <option key={room.value} value={room.value}>
                                        {room.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Цена от */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Цена от (тенге)
                            </label>
                            <input
                                type="number"
                                value={filters.priceFrom}
                                onChange={(e) => setFilters({...filters, priceFrom: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="10000000"
                                disabled={loading}
                            />
                        </div>

                        {/* Цена до */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Цена до (тенге)
                            </label>
                            <input
                                type="number"
                                value={filters.priceTo}
                                onChange={(e) => setFilters({...filters, priceTo: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="40000000"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => handleSearch()}
                            disabled={loading}
                            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 flex items-center space-x-2 font-medium disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <Loader className="w-5 h-5 animate-spin" />
                                    <span>Поиск...</span>
                                </>
                            ) : (
                                <>
                                    <Search className="w-5 h-5" />
                                    <span>Найти объявления</span>
                                </>
                            )}
                        </button>

                        {apartments.length > 0 && (
                            <button
                                onClick={downloadResults}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
                            >
                                <Download className="w-4 h-4" />
                                <span>Скачать результаты</span>
                            </button>
                        )}
                    </div>

                    {error && (
                        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-700">{error}</p>
                        </div>
                    )}
                </div>

                {/* Results Summary */}
                {totalFound > 0 && (
                    <div id="results-section" className="bg-white rounded-lg shadow-md p-4 mb-6">
                        <div className="flex items-center justify-between">
                            <p className="text-gray-600">
                                Найдено объявлений: <span className="font-semibold text-gray-900">{totalFound.toLocaleString()}</span>
                                <span className="text-sm text-gray-500 ml-2">
                                    (страница {currentPage} из {totalPages})
                                </span>
                            </p>

                            {apartments.length > 0 && (
                                <div className="flex items-center space-x-2 text-sm text-gray-600">
                                    <span>На странице: {apartments.length}</span>
                                    <button
                                        onClick={downloadResults}
                                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
                                    >
                                        <Download className="w-4 h-4" />
                                        <span>Скачать страницу</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Pagination Controls */}
                {totalPages > 1 && !loading && (
                    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Назад
                                </button>

                                <div className="flex items-center space-x-1">
                                    {pageNumbers.map((pageNum, index) => {
                                        if (pageNum === -1) {
                                            return <span key={index} className="px-2 text-gray-500">...</span>;
                                        }

                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => handlePageChange(pageNum)}
                                                className={`px-3 py-2 border rounded-lg transition-colors ${
                                                    pageNum === currentPage
                                                        ? 'bg-blue-600 text-white border-blue-600'
                                                        : 'border-gray-300 hover:bg-gray-50'
                                                }`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages || !hasNextPage}
                                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Вперед
                                </button>
                            </div>

                            <div className="flex items-center space-x-2">
                                <span className="text-sm text-gray-600">Перейти на страницу:</span>
                                <input
                                    type="number"
                                    min="1"
                                    max={totalPages}
                                    value={currentPage}
                                    onChange={(e) => {
                                        const page = parseInt(e.target.value);
                                        if (page >= 1 && page <= totalPages) {
                                            handlePageChange(page);
                                        }
                                    }}
                                    className="w-20 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                                />
                                <span className="text-sm text-gray-500">из {totalPages}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Results Grid */}
                {apartments.length > 0 && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                            {apartments.map((apartment) => (
                                <div key={apartment.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-200">
                                    {/* Image */}
                                    <div className="relative">
                                        {apartment.imageUrl ? (
                                            <img
                                                src={apartment.imageUrl}
                                                alt={apartment.title}
                                                className="w-full h-48 object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                                                <Building className="w-12 h-12 text-gray-400" />
                                            </div>
                                        )}

                                        {apartment.isUrgent && (
                                            <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-medium">
                                                Срочно
                                            </div>
                                        )}

                                        <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs flex items-center space-x-1">
                                            <Eye className="w-3 h-3" />
                                            <span>{apartment.views}</span>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-4">
                                        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                                            {apartment.title}
                                        </h3>

                                        <div className="text-xl font-bold text-blue-600 mb-2">
                                            {formatPrice(apartment.price)}
                                        </div>

                                        <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                                            <MapPin className="w-4 h-4" />
                                            <span className="line-clamp-1">{apartment.address}</span>
                                        </div>

                                        <p className="text-sm text-gray-600 line-clamp-3 mb-3">
                                            {apartment.description}
                                        </p>

                                        {apartment.features.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mb-3">
                                                {apartment.features.slice(0, 3).map((feature, index) => (
                                                    <span key={index} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                                                        {feature}
                                                    </span>
                                                ))}
                                                {apartment.features.length > 3 && (
                                                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                                        +{apartment.features.length - 3}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        <a
                                            href={`https://krisha.kz${apartment.url}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block w-full text-center py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                        >
                                            Открыть на Krisha.kz
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Bottom Pagination */}
                        {totalPages > 1 && (
                            <div className="bg-white rounded-lg shadow-md p-4">
                                <div className="flex items-center justify-center">
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => handlePageChange(currentPage - 1)}
                                            disabled={currentPage === 1}
                                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            ← Назад
                                        </button>

                                        <div className="flex items-center space-x-1">
                                            {pageNumbers.map((pageNum, index) => {
                                                if (pageNum === -1) {
                                                    return <span key={index} className="px-2 text-gray-500">...</span>;
                                                }

                                                return (
                                                    <button
                                                        key={pageNum}
                                                        onClick={() => handlePageChange(pageNum)}
                                                        className={`px-3 py-2 border rounded-lg transition-colors ${
                                                            pageNum === currentPage
                                                                ? 'bg-blue-600 text-white border-blue-600'
                                                                : 'border-gray-300 hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <button
                                            onClick={() => handlePageChange(currentPage + 1)}
                                            disabled={currentPage === totalPages || !hasNextPage}
                                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            Вперед →
                                        </button>
                                    </div>
                                </div>

                                <div className="text-center mt-3 text-sm text-gray-600">
                                    Страница {currentPage} из {totalPages} • Всего найдено: {totalFound.toLocaleString()}
                                    {hasNextPage && currentPage === totalPages && (
                                        <span className="text-blue-600 ml-2">(есть ещё)</span>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Empty State */}
                {!loading && apartments.length === 0 && !error && (
                    <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
                        <Home className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            Объявления не найдены
                        </h3>
                        <p className="text-gray-600">
                            Попробуйте изменить параметры поиска
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}