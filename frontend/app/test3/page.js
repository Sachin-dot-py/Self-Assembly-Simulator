'use client'

import React from 'react'
import { useEffect, useState } from 'react';

import InnerHTML from 'dangerously-set-html-content'

export default function Page() {
    const [htmlContent, setHtmlContent] = useState('<p>Loading...</p>');

    useEffect(() => {
        fetch('/api/getfiles/indexhtml')
          .then(response => {
            console.log('Response status:', response.status);
            return response.text();
          })
          .then(html => {
            console.log('Fetched HTML:', html);
            setHtmlContent(html);
          })
          .catch(error => console.error('Error fetching HTML:', error));
      }, []);
  
    return (
        <InnerHTML html={htmlContent} />
    )
}