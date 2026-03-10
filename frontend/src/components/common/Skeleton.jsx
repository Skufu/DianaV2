import { memo } from 'react';

export const Skeleton = memo(({ className = '', ...props }) => {
  return <div className={`animate-pulse bg-slate-200 rounded-lg ${className}`} {...props} />;
});

Skeleton.displayName = 'Skeleton';

export const LoginFormSkeleton = () => {
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-24 ml-1" />
        <Skeleton className="h-11 w-full" />
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-24 ml-1" />
        <Skeleton className="h-11 w-full" />
      </div>
      <div className="flex justify-between items-center py-1">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-28" />
      </div>
      <Skeleton className="h-12 w-full mt-2" />
      <div className="relative my-6 flex justify-center">
        <Skeleton className="h-4 w-8" />
      </div>
      <Skeleton className="h-11 w-full" />
      <div className="flex justify-center mt-6">
        <Skeleton className="h-4 w-48" />
      </div>
    </div>
  );
};

export const SignupFormSkeleton = () => {
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-24 ml-1" />
        <Skeleton className="h-11 w-full" />
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-24 ml-1" />
        <Skeleton className="h-11 w-full" />
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-24 ml-1" />
        <Skeleton className="h-11 w-full" />
      </div>
      <Skeleton className="h-12 w-full mt-4" />
      <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center">
        <Skeleton className="h-4 w-48" />
      </div>
    </div>
  );
};
