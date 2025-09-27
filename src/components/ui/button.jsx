import React from 'react'
export function Button({ className = '', variant = 'default', size='md', ...props }) {
  const base = 'inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-medium transition';
  const variants = {
    default: 'bg-green-600 hover:bg-green-700 text-white',
    secondary: 'bg-white border border-green-300 text-green-800 hover:bg-green-50',
    destructive: 'bg-red-600 hover:bg-red-700 text-white',
  };
  return <button className={`${base} ${variants[variant]||variants.default} ${className}`} {...props} />;
}
