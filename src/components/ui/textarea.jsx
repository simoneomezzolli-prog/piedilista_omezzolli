import React from 'react'
export function Textarea(props) {
  return <textarea {...props} className={`w-full rounded-lg border border-green-300 px-3 py-2 text-sm ${props.className||''}`} />;
}
