import React from 'react';

const Test004 = () => {
    const [cookies, setCookies] = React.useState({});

    // Cookieを読み込む関数
    const readCookies = () => {
        const cookieString = document.cookie;
        const cookieArray = cookieString.split('; ');
        const cookieObj = {};
        
        cookieArray.forEach(cookie => {
            const [name, value] = cookie.split('=');
            cookieObj[name] = decodeURIComponent(value);
        });

        setCookies(cookieObj);
    };

    React.useEffect(() => {
        readCookies();
    }, []);

    return (
        <div>
            <h2>ブラウザのCookie</h2>
            <ul>
                {Object.entries(cookies).map(([name, value]) => (
                    <li key={name}>
                        <strong>{name}:</strong> {value}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Test004;
