import ApartmentSkeleton from './ApartmentSkeleton';

interface SkeletonGridProps {
    count?: number;
}

export default function SkeletonGrid({ count = 12 }: SkeletonGridProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: count }).map((_, index) => (
                <ApartmentSkeleton key={index} />
            ))}
        </div>
    );
}