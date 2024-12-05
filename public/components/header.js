class Header extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.innerHTML = `
            <div class="top-bar">
                <div class="logo-section">
                    <i class="fas fa-dollar-sign logo-icon"></i>
                    <span>BetManeira</span>
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

        console.log(userData);
        
        if (userData) {
            usernameElement.textContent = userData.name;
            userBalanceElement.textContent = `R$ ${userData.balance.toFixed(2)}`;
            loginButton.textContent = 'Logout';
        } else {
            usernameElement.textContent = 'Convidado';
            userBalanceElement.textContent = '';
            loginButton.textContent = 'Login';
        }
    }

    checkLoginStatus() {
        const userData = JSON.parse(localStorage.getItem('userData'));
        this.updateUserDisplay(userData);
    }

}

customElements.define('header-component', Header);