import { getMessages, postMessage, editMessage, deleteMessage, login, register } from "./api.js"

// --- State ---

const state = {
  user: null,
  messages: [],
}

// --- DOM selectors ---

const userInfo = document.getElementById("user-info")
const usernameDisplay = document.getElementById("username-display")
const logoutButton = document.getElementById("logout-btn")
const authSection = document.getElementById("auth-section")
const showLoginButton = document.getElementById("show-login-btn")
const showRegisterButton = document.getElementById("show-register-btn")
const loginForm = document.getElementById("login-form")
const registerForm = document.getElementById("register-form")
const loginError = document.getElementById("login-error")
const registerError = document.getElementById("register-error")
const globalError = document.getElementById("global-error")
const loginPrompt = document.getElementById("login-prompt")
const postFormWrapper = document.getElementById("post-form-wrapper")
const postForm = document.getElementById("post-form")
const postTextarea = document.getElementById("post-textarea")
const postError = document.getElementById("post-error")
const submitPostButton = document.getElementById("submit-post-btn")
const messageList = document.getElementById("message-list")

// --- Auth ---

const setUser = (user) => {
  state.user = user
  if (user) {
    usernameDisplay.textContent = user.response.username
    userInfo.classList.remove("hidden")
    authSection.classList.add("hidden")
    loginPrompt.classList.add("hidden")
    postFormWrapper.classList.remove("hidden")
  } else {
    userInfo.classList.add("hidden")
    authSection.classList.remove("hidden")
    loginForm.classList.add("hidden")
    registerForm.classList.add("hidden")
    loginPrompt.classList.remove("hidden")
    postFormWrapper.classList.add("hidden")
  }
}

const handleUnauthorized = () => {
  globalError.textContent = "Your session has expired, please log in again"
  globalError.classList.remove("hidden")
  setUser(null)
}

showLoginButton.addEventListener("click", () => {
  loginForm.classList.toggle("hidden")
  registerForm.classList.add("hidden")
})

showRegisterButton.addEventListener("click", () => {
  registerForm.classList.toggle("hidden")
  loginForm.classList.add("hidden")
})

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault()
  loginError.classList.add("hidden")
  const loginButton = loginForm.querySelector("button[type=submit]")
  loginButton.disabled = true
  try {
    const userData = await login(event.target.login.value, event.target.password.value)
    setUser(userData)
    loginForm.reset()
    loginButton.disabled = false
  } catch (error) {
    loginError.textContent = error.message
    loginError.classList.remove("hidden")
    loginButton.disabled = false
  }
})

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault()
  registerError.classList.add("hidden")
  const registerButton = registerForm.querySelector("button[type=submit]")
  registerButton.disabled = true
  try {
    const userData = await register(event.target.username.value, event.target.email.value, event.target.password.value)
    setUser(userData)
    registerForm.reset()
    registerButton.disabled = false
  } catch (error) {
    registerError.textContent = error.message
    registerError.classList.remove("hidden")
    registerButton.disabled = false
  }
})

logoutButton.addEventListener("click", () => setUser(null))

// --- Post form ---

postTextarea.addEventListener("input", () => {
  postError.textContent = ""
})

postForm.addEventListener("submit", async (event) => {
  event.preventDefault()
  submitPostButton.disabled = true
  const postResponse = await postMessage(postTextarea.value, state.user.response.accessToken)
  if (postResponse.unauthorized) {
    handleUnauthorized()
    return
  }
  if (postResponse.message && !postResponse._id) {
    postError.textContent = postResponse.message
    submitPostButton.disabled = false
    return
  }
  postTextarea.value = ""
  postError.textContent = ""
  submitPostButton.disabled = false
  await loadMessages()
})

// --- Messages ---

const loadMessages = async () => {
  messageList.innerHTML = `<div class="spinner"></div>`
  state.messages = await getMessages()
  messageList.innerHTML = ""
  for (const message of state.messages) {
    messageList.appendChild(createMessageElement(message))
  }
}

const createMessageElement = (message) => {
  const isOwner = state.user && state.user.response.id === message.user._id

  const messageElement = document.createElement("div")
  messageElement.className = "message"
  messageElement.dataset.id = message._id
  messageElement.innerHTML = `
    <div class="message-header">
      <p class="message-text"></p>
      <div class="edit-wrapper hidden">
        <label>
          <textarea class="edit-textarea" rows="3"></textarea>
          <p class="error edit-error"></p>
        </label>
      </div>
      <div class="message-actions">
        <button type="button" class="delete-btn">🗑️</button>
        ${isOwner ? `
          <button type="button" class="edit-btn">✏️</button>
          <button type="button" class="save-btn hidden">💾</button>
          <button type="button" class="cancel-btn hidden">❌</button>
        ` : ""}
      </div>
    </div>
    <div class="info-wrapper">
      <div class="info-user"></div>
    </div>
  `

  messageElement.querySelector(".message-text").textContent = message.message
  messageElement.querySelector(".edit-textarea").value = message.message

  if (message.user && message.user.username) {
    messageElement.querySelector(".info-user").textContent = message.user.username
  }

  // Event listeners
  const messageText = messageElement.querySelector(".message-text")
  const editWrapper = messageElement.querySelector(".edit-wrapper")
  const editTextarea = messageElement.querySelector(".edit-textarea")
  const editError = messageElement.querySelector(".edit-error")

  const deleteButton = messageElement.querySelector(".delete-btn")
  deleteButton.addEventListener("click", async () => {
    await deleteMessage(message._id)
    await loadMessages()
  })

  if (isOwner) {
    const editButton = messageElement.querySelector(".edit-btn")
    const saveButton = messageElement.querySelector(".save-btn")
    const cancelButton = messageElement.querySelector(".cancel-btn")

    editButton.addEventListener("click", () => {
      messageText.classList.add("hidden")
      editWrapper.classList.remove("hidden")
      editButton.classList.add("hidden")
      saveButton.classList.remove("hidden")
      cancelButton.classList.remove("hidden")
    })

    cancelButton.addEventListener("click", () => {
      messageText.classList.remove("hidden")
      editWrapper.classList.add("hidden")
      editButton.classList.remove("hidden")
      saveButton.classList.add("hidden")
      cancelButton.classList.add("hidden")
    })

    editTextarea.addEventListener("input", () => {
      editError.textContent = ""
    })

    saveButton.addEventListener("click", async () => {
      const editResponse = await editMessage(message._id, editTextarea.value, state.user.response.accessToken)
      if (editResponse.unauthorized) {
        handleUnauthorized()
        return
      }
      if (editResponse.error) {
        editError.textContent = editResponse.error
        return
      }
      await loadMessages()
    })
  }

  return messageElement
}

// --- Init ---
loadMessages()
