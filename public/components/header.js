class Header extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.innerHTML = `
            <div class="top-bar">
                <div class="logo-section">
                    <i class="fas fa-dollar-sign logo-icon"></i>
                    <a href="/" style="text-decoration: none; color: inherit;"><span>BetManeira</span></a>
                </div>
                <div class="user-section">
                    <div class="user-info">
                        <i class="fas fa-user"></i>
                        <span id="username">Convidado</span>
                        <span id="userBalance" class="user-balance"></span>
                    </div>
                    <button class="login-button" id="loginButton">Login</button>
                </div>
            </div>
        `;

        this.initializeAuth();
    }

    initializeAuth() {
        const loginButton = document.getElementById('loginButton');
        
        loginButton.addEventListener('click', () => {
            this.updateUserDisplay(null);
            window.location.href = 'login.html';
        });

        this.checkLoginStatus();
    }

    updateUserDisplay(userData) {
        const usernameElement = document.getElementById('username');
        const userBalanceElement = document.getElementById('userBalance');
        const loginButton = document.getElementById('loginButton');
        
        if (userData && userData.name && userData.balance !== undefined) {
            usernameElement.textContent = userData.name;
            userBalanceElement.textContent = `R$ ${Number(userData.balance).toFixed(2)}`;
            loginButton.textContent = 'Logout';
        } else {
            usernameElement.textContent = 'Convidado';
            userBalanceElement.textContent = 'R$ 0,00';
            loginButton.textContent = 'Login';
        }
    }

    checkLoginStatus() {
        const userData = JSON.parse(localStorage.getItem('userData'));
        this.updateUserDisplay(userData);
    }

}

customElements.define('header-component', Header);