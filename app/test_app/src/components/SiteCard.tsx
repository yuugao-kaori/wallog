import React from 'react';
import Image from 'next/image';

interface SiteCardProps {
  title: string;
  description: string;
  thumbnailId: string | null;
  url: string;
}

const SiteCard: React.FC<SiteCardProps> = ({ title, description, thumbnailId, url }) => {
  const domain = url.replace(/^https?:\/\//, '').split('/')[0];
  
  return (
    <a 
      href={url} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="block mt-2 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex flex-col sm:flex-row">
        {thumbnailId && (
          <div className="sm:w-1/3 h-40 sm:h-auto relative bg-gray-100 dark:bg-gray-800">
            <Image
              src={`${process.env.NEXT_PUBLIC_SITE_DOMAIN}/api/drive/file/${thumbnailId}/thumbnail`}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 33vw"
            />
          </div>
        )}
        <div className={`p-3 ${thumbnailId ? 'sm:w-2/3' : 'w-full'}`}>
          <div className="font-medium text-blue-600 dark:text-blue-400 mb-1 line-clamp-2 break-words">{title}</div>
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-2 line-clamp-2">{description}</p>
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{domain}</div>
        </div>
      </div>
    </a>
  );
};

export default SiteCard;