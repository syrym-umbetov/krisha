export default function ApartmentSkeleton() {
    return (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden animate-pulse">
            {/* Image skeleton */}
            <div className="w-full h-48 bg-gray-200"></div>

            {/* Content skeleton */}
            <div className="p-4">
                {/* Title */}
                <div className="h-5 bg-gray-200 rounded mb-3 w-3/4"></div>

                {/* Price */}
                <div className="h-6 bg-gray-200 rounded mb-2 w-1/2"></div>

                {/* Address */}
                <div className="h-4 bg-gray-200 rounded mb-2 w-full"></div>

                {/* Description */}
                <div className="space-y-2 mb-3">
                    <div className="h-3 bg-gray-200 rounded w-full"></div>
                    <div className="h-3 bg-gray-200 rounded w-4/5"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/5"></div>
                </div>

                {/* Features */}
                <div className="flex space-x-2 mb-3">
                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                    <div className="h-6 bg-gray-200 rounded w-20"></div>
                    <div className="h-6 bg-gray-200 rounded w-12"></div>
                </div>

                {/* Button */}
                <div className="h-10 bg-gray-200 rounded w-full"></div>
            </div>
        </div>
    );
}