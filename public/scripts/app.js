document.addEventListener("DOMContentLoaded", () => {
    // ----------------------------
    // 검색, 수정, 삭제, 저장 관련 기존 코드
    // ----------------------------
    const searchButton = document.getElementById("search-button");
    const passwordInput = document.getElementById("password-search");
    const promptTableBody = document.querySelector("#prompt-table tbody");
    const promptForm = document.getElementById("prompt-form");

    if (!promptForm) {
        console.error("prompt-form not found!");
    } else {
        console.log("prompt-form found, registering submit event.");
    }

    // 검색 버튼 클릭 이벤트 처리
    searchButton.addEventListener("click", async () => {
        const password = passwordInput.value.trim();
        if (!password) {
            alert("Please enter a password!");
            return;
        }
  
        try {
            const response = await fetch("/search-prompts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
            });
  
            const result = await response.json();
            if (result.success) {
                renderPrompts(result.prompts);
            } else {
                alert("No prompts found or an error occurred.");
            }
        } catch (error) {
            console.error("Error fetching prompts:", error);
            alert("Failed to search prompts.");
        }
    });
  
    // 검색 결과를 테이블 형식으로 렌더링하는 함수
    function renderPrompts(prompts) {
        promptTableBody.innerHTML = "";
  
        if (prompts.length === 0) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");
            cell.setAttribute("colspan", "4");
            cell.textContent = "No prompts found for the given password.";
            row.appendChild(cell);
            promptTableBody.appendChild(row);
            return;
        }
  
        prompts.forEach((prompt) => {
            const row = document.createElement("tr");
  
            const activityCell = document.createElement("td");
            activityCell.textContent = prompt.activityCode || "";
            row.appendChild(activityCell);
  
            const teacherCell = document.createElement("td");
            teacherCell.textContent = prompt.teacherPrompt || "";
            row.appendChild(teacherCell);
  
            const studentCell = document.createElement("td");
            studentCell.textContent = prompt.studentView || "";
            row.appendChild(studentCell);
  
            const actionCell = document.createElement("td");
  
            const editButton = document.createElement("button");
            editButton.textContent = "Edit";
            editButton.classList.add("edit-btn");
            editButton.setAttribute("data-id", prompt.id);
            editButton.addEventListener("click", () => {
                handleEdit(prompt);
            });
            actionCell.appendChild(editButton);
  
            const deleteButton = document.createElement("button");
            deleteButton.textContent = "Delete";
            deleteButton.classList.add("delete-btn");
            deleteButton.setAttribute("data-id", prompt.id);
            deleteButton.addEventListener("click", () => {
                handleDelete(prompt.id);
            });
            actionCell.appendChild(deleteButton);
  
            row.appendChild(actionCell);
            promptTableBody.appendChild(row);
        });
    }
  
    // Handle Delete
    async function handleDelete(id) {
        if (!confirm("Are you sure you want to delete this prompt?")) {
            return;
        }
  
        try {
            const response = await fetch("/delete-prompt", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });
            const result = await response.json();
            if (result.success) {
                alert("Prompt deleted successfully.");
                searchButton.click();
            } else {
                alert("Failed to delete prompt: " + result.error);
            }
        } catch (error) {
            console.error("Error deleting prompt:", error);
            alert("An error occurred while deleting the prompt.");
        }
    }
  
    // Handle Edit
    async function handleEdit(promptData) {
        const newActivityCode = prompt("Enter new Activity Code:", promptData.activityCode);
        if (newActivityCode === null) return;
        
        let newTeacherPrompt;
        let newAdjectives; // *** 이미지 타입일 때 추가할 형용사 입력 변수
        
        if (promptData.promptType === "image") { // *** 이미지 타입인 경우
            newTeacherPrompt = prompt("Enter new Image Topic:", promptData.teacherPrompt);
            if (newTeacherPrompt === null) return;
            // *** 기존 adjectives 값이 없으면 promptData.studentView를 사용하여 기본값 생성 ***
            let adjectivesSource = promptData.adjectives || promptData.studentView || "";
            let defaultAdjectives = "";
            try {
                const arr = JSON.parse(adjectivesSource);
                defaultAdjectives = arr.join(", ");
            } catch (e) {
                defaultAdjectives = adjectivesSource;
            }
            newAdjectives = prompt("Enter new adjectives (comma separated):", defaultAdjectives); // ***
            if (newAdjectives === null) return;
        } else { // 이미지 외의 타입은 기존대로 처리
            newTeacherPrompt = prompt("Enter new Teacher Prompt:", promptData.teacherPrompt);
            if (newTeacherPrompt === null) return;
        }
        
        const newEmail = prompt("Enter new Email:", promptData.email || "");
        if (newEmail === null) return;
        const newPassword = prompt("Enter new Password:", promptData.password || "");
        if (newPassword === null) return;
        
        // *** 프롬프트 타입은 고정값으로 사용 (promptData.promptType)하므로 질문하지 않음 ***
        const fixedPromptType = promptData.promptType; // ***

        try {
            const payload = {
                id: promptData.id,
                activityCode: newActivityCode,
                teacherPrompt: newTeacherPrompt,
                email: newEmail,
                password: newPassword,
                promptType: fixedPromptType, // *** 고정된 프롬프트 타입 사용 ***
            };
            // *** 이미지 타입일 경우, adjectives도 함께 전송 ***
            if (fixedPromptType === "image") {
                payload.adjectives = newAdjectives;
            }
    
            const response = await fetch("/update-prompt", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const result = await response.json();
            if (result.success) {
                alert("Prompt updated successfully.");
                searchButton.click();
            } else {
                alert("Failed to update prompt: " + result.error);
            }
        } catch (error) {
            console.error("Error updating prompt:", error);
            alert("An error occurred while updating the prompt.");
        }
    }

    // ----------------------------
    // Specialized Options Toggle Functions
    // ----------------------------
    const genericTeacherPromptContainer = document.getElementById("generic-teacher-prompt-container");
    const visionOptions = document.getElementById("vision-options");
    const textOptions = document.getElementById("text-options");
    const chatbotOptions = document.getElementById("chatbot-options");
  
    function toggleVisionOptions(show) {
        const teacherPromptField = document.getElementById("teacher-prompt");
        if (show) {
            visionOptions.style.display = "block";
            teacherPromptField.removeAttribute("required");
            teacherPromptField.disabled = true;
        } else {
            visionOptions.style.display = "none";
        }
    }
  
    function toggleTextOptions(show) {
        if (show) {
            textOptions.style.display = "block";
        } else {
            textOptions.style.display = "none";
        }
    }
  
    function toggleChatbotOptions(show) {
        if (show) {
            chatbotOptions.style.display = "block";
        } else {
            chatbotOptions.style.display = "none";
        }
    }
  
    // ----------------------------
    // Prompt Type Change Event
    // ----------------------------
    const promptTypeSelect = document.getElementById('prompt-type');
    promptTypeSelect.addEventListener('change', function() {
        const selectedType = this.value;
        // 기본적으로 모든 specialized 옵션 숨김
        toggleVisionOptions(false);
        toggleTextOptions(false);
        toggleChatbotOptions(false);
        toggleImageOptions(false);
        // 기본 입력창 표시 (generic)
        genericTeacherPromptContainer.style.display = "block";

        // specialized 옵션 보이기
        if (selectedType === "vision") {
            toggleVisionOptions(true);
            genericTeacherPromptContainer.style.display = "none";
        } else if (selectedType === "text") {
            toggleTextOptions(true);
            genericTeacherPromptContainer.style.display = "none";
        } else if (selectedType === "chatbot") {
            toggleChatbotOptions(true);
            genericTeacherPromptContainer.style.display = "none";
        } else if (selectedType === "image") {
            toggleImageOptions(true);
            genericTeacherPromptContainer.style.display = "none";
            // *** 수정: image 타입 선택 시 기본 형용사 모드(기본 사용)로 강제 설정 ***
            document.querySelector('input[name="image-adjective-mode"][value="default"]').checked = true;  // ***
            document.getElementById("default-adjectives-container").style.display = "block";           // ***
            const defaultAdjectives = [                                                               // ***
                "몽환적인", "현실적인", "우아한", "고요한", "활기찬",                                 // ***
                "긴장감 있는", "로맨틱한", "공포스러운", "신비로운", "평화로운",                         // ***
                "미니멀한", "복잡한", "빈티지한", "모던한", "고전적인",                                 // ***
                "미래적인", "자연주의적인", "기하학적인", "추상적인", "대담한",                           // ***
                "매끄러운", "거친", "부드러운", "뾰족한", "질감이 느껴지는",                             // ***
                "광택 있는", "매트한", "무광의", "즐거운", "슬픈",                                       // ***
                "분노한", "평온한", "감동적인", "따뜻한", "외로운",                                     // ***
                "흥미로운", "짜릿한", "사려 깊은"                                                        // ***
            ];                                                                                        // ***
            document.getElementById("default-adjectives-text").innerText = defaultAdjectives.join(", ");  // ***
        }
    });

    // 초기 상태: specialized 옵션 보이기 여부 결정
    if (promptTypeSelect.value === "vision") {
        toggleVisionOptions(true);
        genericTeacherPromptContainer.style.display = "none";
    } else if (promptTypeSelect.value === "text") {
        toggleTextOptions(true);
        genericTeacherPromptContainer.style.display = "none";
    } else if (promptTypeSelect.value === "chatbot") {
        toggleChatbotOptions(true);
        genericTeacherPromptContainer.style.display = "none";
    } else if (promptTypeSelect.value === "image") {
        toggleImageOptions(true);
        genericTeacherPromptContainer.style.display = "none";
    } else {
        genericTeacherPromptContainer.style.display = "block";
    }

    // ----------------------------
    // Image Option Toggle Functions
    // ----------------------------
    function toggleImageOptions(show) {
        const imageOptions = document.getElementById("image-options");
        if (show) {
            imageOptions.style.display = "block";
        } else {
            imageOptions.style.display = "none";
        }
    }
    // Image 주제 모드 토글
    const imageTopicMethodRadios = document.getElementsByName("image-topic-method");
    Array.from(imageTopicMethodRadios).forEach(radio => {
    radio.addEventListener("change", function() {
        const value = this.value;
        if(value === "sample") {
        document.getElementById("image-topic-sample-container").style.display = "block";
        document.getElementById("image-topic-direct-container").style.display = "none";
        } else if(value === "direct") {
        document.getElementById("image-topic-sample-container").style.display = "none";
        document.getElementById("image-topic-direct-container").style.display = "block";
        }
    });
    });

    // Image 샘플 주제 선택 이벤트
    const imageSampleSelect = document.getElementById("image-sample-select");
    const imageSampleTopic = document.getElementById("image-sample-topic");
    // 예시 sample 주제와 설명 객체
    const imageSampleTopics = {
        "2학년 과학시간 - 숲 속의 동물": "숲 속에 사는 다양한 동물들의 모습을 설명하는 이미지 생성 의도.",
        "2학년 체육시간 - 공원에서의 놀이": "공원에서의 놀이 장면을 통해 체육 활동의 즐거움을 나타내는 이미지 생성 의도.",
        "3학년 미술시간 - 문화 축제 장면": "문화 축제 장면을 통해 다양한 문화를 이해하도록 돕는 이미지 생성 의도.",
        "3학년 사회시간 - 바닷가 풍경": "바닷가의 풍경과 지리적 특성을 학생들이 이해할 수 있도록 하는 이미지 생성 의도.",
        "4학년 사회시간 - 자연재해 현장": "자연재해의 현장을 통해 재난 대비와 그 영향을 설명하는 이미지 생성 의도.",
        "4학년 역사시간 - 역사적인 건축물": "역사적인 건축물의 의미와 양식을 설명하는 이미지 생성 의도."
    };
    imageSampleSelect.addEventListener("change", function() {
        const selected = this.value;
        if(selected && imageSampleTopics[selected]) {
            imageSampleTopic.value = imageSampleTopics[selected];
        } else {
            imageSampleTopic.value = "";
        }
    });

    // Image 형용사 모드 토글
    const imageAdjectiveModeRadios = document.getElementsByName("image-adjective-mode");
    Array.from(imageAdjectiveModeRadios).forEach(radio => {
    radio.addEventListener("change", function() {
        const value = this.value;
        if(value === "default") {
        document.getElementById("default-adjectives-container").style.display = "block";
        document.getElementById("custom-adjectives-container").style.display = "none";
        // 기본 형용사 목록 (수정: 원하는 기본 형용사 리스트)
        const defaultAdjectives = [
            "몽환적인", "현실적인", "우아한", "고요한", "활기찬", 
            "긴장감 있는", "로맨틱한", "공포스러운", "신비로운", "평화로운",
            "미니멀한", "복잡한", "빈티지한", "모던한", "고전적인", 
            "미래적인", "자연주의적인", "기하학적인", "추상적인", "대담한",
            "매끄러운", "거친", "부드러운", "뾰족한", "질감이 느껴지는", 
            "광택 있는", "매트한", "무광의", "즐거운", "슬픈",
            "분노한", "평온한", "감동적인", "따뜻한", "외로운",
            "흥미로운", "짜릿한", "사려 깊은"
        ];
        document.getElementById("default-adjectives-text").innerText = defaultAdjectives.join(", ");
        } else if(value === "custom") {
        document.getElementById("default-adjectives-container").style.display = "none";
        document.getElementById("custom-adjectives-container").style.display = "block";
        }
    });
    });

    // ----------------------------
    // Form Submission Event (with image type handling)
    // ----------------------------
    promptForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        console.log("Form submit event triggered.");

        const activityCode = document.getElementById("activity-code").value.trim();
        let teacherPrompt = document.getElementById("teacher-prompt").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value.trim();
        const promptType = document.getElementById("prompt-type").value;

        // image 타입에서 사용할 adjectives_json 변수를 미리 선언
        let adjectives_json;

        // specialized 옵션 사용 시, 해당 입력창의 값을 가져옴
        if (promptType === "vision") {
            const selectedVisionMethod = document.querySelector('input[name="vision-method"]:checked').value;
            console.log("Selected Vision method:", selectedVisionMethod);
            if (selectedVisionMethod === "direct") {
                teacherPrompt = document.getElementById("vision-direct").value.trim();
            } else if (selectedVisionMethod === "sample") {
                teacherPrompt = document.getElementById("vision-sample-prompt").value.trim();
            } else if (selectedVisionMethod === "ai") {
                teacherPrompt = document.getElementById("vision-ai-prompt").value.trim();
            }
            if (!teacherPrompt) {
                alert("프롬프트 내용을 입력하거나 생성하세요.");
                return;
            }
        } else if (promptType === "text") {
            const selectedTextMethod = document.querySelector('input[name="text-method"]:checked').value;
            console.log("Selected Text method:", selectedTextMethod);
            if (selectedTextMethod === "direct") {
                teacherPrompt = document.getElementById("text-direct").value.trim();
            } else if (selectedTextMethod === "sample") {
                teacherPrompt = document.getElementById("text-sample-prompt").value.trim();
            } else if (selectedTextMethod === "ai") {
                teacherPrompt = document.getElementById("text-ai-prompt").value.trim();
            }
            if (!teacherPrompt) {
                alert("프롬프트 내용을 입력하거나 생성하세요.");
                return;
            }
        } else if (promptType === "chatbot") {
            const selectedChatbotMethod = document.querySelector('input[name="chatbot-method"]:checked').value;
            console.log("Selected Chatbot method:", selectedChatbotMethod);
            if (selectedChatbotMethod === "direct") {
                teacherPrompt = document.getElementById("chatbot-direct").value.trim();
            } else if (selectedChatbotMethod === "sample") {
                teacherPrompt = document.getElementById("chatbot-sample-prompt").value.trim();
            } else if (selectedChatbotMethod === "ai") {
                teacherPrompt = document.getElementById("chatbot-ai-prompt").value.trim();
            }
            if (!teacherPrompt) {
                alert("프롬프트 내용을 입력하거나 생성하세요.");
                return;
            }
        } else if (promptType === "image") {
            // 이미지 타입의 경우, 두 부분의 입력값을 합쳐서 저장함
            let imageTopic = "";
            const selectedImageTopicMethod = document.querySelector('input[name="image-topic-method"]:checked').value;
            if (selectedImageTopicMethod === "sample") {
                imageTopic = document.getElementById("image-sample-select").value;
                if (!imageTopic) {
                    alert("샘플 이미지 주제를 선택하세요.");
                    return;
                }
            } else if (selectedImageTopicMethod === "direct") {
                imageTopic = document.getElementById("image-topic-direct").value.trim();
                if (!imageTopic) {
                    alert("이미지 주제를 직접 입력하세요.");
                    return;
                }
            }
    
            // 형용사 입력 방식 처리
            const selectedAdjectiveMode = document.querySelector('input[name="image-adjective-mode"]:checked').value;
            // 기본 형용사 리스트 (하드코딩)
            const DEFAULT_ADJECTIVES = [
                "몽환적인", "현실적인", "우아한", "고요한", "활기찬", "긴장감 있는",
                "로맨틱한", "공포스러운", "신비로운", "평화로운", "미니멀한", "복잡한",
                "빈티지한", "모던한", "고전적인", "미래적인", "자연주의적인", "기하학적인",
                "추상적인", "대담한", "매끄러운", "거친", "부드러운", "뾰족한", "질감이 느껴지는",
                "광택 있는", "매트한", "무광의", "즐거운", "슬픈", "분노한", "평온한",
                "감동적인", "따뜻한", "외로운", "흥미로운", "짜릿한", "사려 깊은"
            ];
            if (selectedAdjectiveMode === "default") {
                adjectives_json = JSON.stringify(DEFAULT_ADJECTIVES);
            } else if (selectedAdjectiveMode === "custom") {
                const customAdjectives = document.getElementById("custom-adjectives").value.trim();
                if (!customAdjectives) {
                    alert("커스텀 형용사를 입력하세요.");
                    return;
                }
                adjectives_json = JSON.stringify(customAdjectives.split(",").map(adj => adj.trim()));
            }
            // 이미지 타입의 최종 프롬프트는 imageTopic (주제)로 사용합니다.
            teacherPrompt = imageTopic;
        }
    
        if (!activityCode || !teacherPrompt || !email || !password || !promptType) {
            alert("Please fill in all fields!");
            return;
        }
    
        try {
            console.log("Sending data to /save-to-db...");
            const response = await fetch("/save-to-db", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                activityCode, 
                teacherPrompt, 
                email, 
                password, 
                promptType, 
                adjectives: (promptType === "image" ? adjectives_json : undefined)
                }),
            });
    
            const result = await response.json();
            console.log("Response from /save-to-db:", result);
            if (result.success) {
                alert("Prompt saved successfully!");
                // *** 수정: 현재 선택한 prompt type 값을 저장 후 폼 리셋 후 복원 ***
                const currentPromptType = document.getElementById("prompt-type").value;  // ***
                promptForm.reset();  // ***
                document.getElementById("prompt-type").value = currentPromptType;  // ***
                document.getElementById("prompt-type").dispatchEvent(new Event("change"));  // ***
            } else {
                alert("Failed to save prompt: " + result.error);
            }
        } catch (error) {
            console.error("Error saving prompt:", error);
            alert("An error occurred while saving the prompt.");
        }
    });
    
    // ----------------------------
    // Vision Option Radio Buttons
    // ----------------------------
    const visionMethodRadios = document.getElementsByName("vision-method");
    Array.from(visionMethodRadios).forEach(radio => {
      radio.addEventListener("change", function() {
         const value = this.value;
         if(value === "direct") {
            document.getElementById("vision-direct-container").style.display = "block";
            document.getElementById("vision-sample-container").style.display = "none";
            document.getElementById("vision-ai-container").style.display = "none";
         } else if(value === "sample") {
            document.getElementById("vision-direct-container").style.display = "none";
            document.getElementById("vision-sample-container").style.display = "block";
            document.getElementById("vision-ai-container").style.display = "none";
         } else if(value === "ai") {
            document.getElementById("vision-direct-container").style.display = "none";
            document.getElementById("vision-sample-container").style.display = "none";
            document.getElementById("vision-ai-container").style.display = "block";
         }
      });
    });
  
    // ----------------------------
    // Text Option Radio Buttons
    // ----------------------------
    const textMethodRadios = document.getElementsByName("text-method");
    Array.from(textMethodRadios).forEach(radio => {
      radio.addEventListener("change", function() {
         const value = this.value;
         if(value === "direct") {
            document.getElementById("text-direct-container").style.display = "block";
            document.getElementById("text-sample-container").style.display = "none";
            document.getElementById("text-ai-container").style.display = "none";
         } else if(value === "sample") {
            document.getElementById("text-direct-container").style.display = "none";
            document.getElementById("text-sample-container").style.display = "block";
            document.getElementById("text-ai-container").style.display = "none";
         } else if(value === "ai") {
            document.getElementById("text-direct-container").style.display = "none";
            document.getElementById("text-sample-container").style.display = "none";
            document.getElementById("text-ai-container").style.display = "block";
         }
      });
    });
  
    // ----------------------------
    // Chatbot Option Radio Buttons
    // ----------------------------
    const chatbotMethodRadios = document.getElementsByName("chatbot-method");
    Array.from(chatbotMethodRadios).forEach(radio => {
      radio.addEventListener("change", function() {
         const value = this.value;
         if(value === "direct") {
            document.getElementById("chatbot-direct-container").style.display = "block";
            document.getElementById("chatbot-sample-container").style.display = "none";
            document.getElementById("chatbot-ai-container").style.display = "none";
         } else if(value === "sample") {
            document.getElementById("chatbot-direct-container").style.display = "none";
            document.getElementById("chatbot-sample-container").style.display = "block";
            document.getElementById("chatbot-ai-container").style.display = "none";
         } else if(value === "ai") {
            document.getElementById("chatbot-direct-container").style.display = "none";
            document.getElementById("chatbot-sample-container").style.display = "none";
            document.getElementById("chatbot-ai-container").style.display = "block";
         }
      });
    });
  
    // ----------------------------
    // Sample Prompt Selection Events
    // ----------------------------
    // Vision Sample
    const visionSampleSelect = document.getElementById("vision-sample-select");
    const visionSamplePrompt = document.getElementById("vision-sample-prompt");
    const visionSamplePrompts = {
        "2학년 미술시간 - 사진 속 감정 분석": "사진 속 인물들의 감정을 분석하여 초등학생이 이해할 수 있도록 설명해 주세요.",
        "2학년 사회시간 - 풍경 사진 설명": "풍경 사진을 보고, 그 특징과 아름다움을 초등학생이 이해할 수 있도록 설명해 주세요.",
        "2학년 과학시간 - 동물 사진 설명": "동물 사진을 보고, 그 동물의 특성을 설명하고, 초등학생이 이해할 수 있도록 쉽게 풀어 설명해 주세요.",
        "2학년 미술시간 - 미술 작품 분석": "미술 작품 사진을 보고, 초등학생이 이해할 수 있도록 그 작품의 주요 특징을 설명해 주세요.",
        "3학년 과학시간 - 자연 현상 분석": "자연 현상의 사진을 보고, 그 현상이 무엇인지 설명하고 왜 그런 현상이 일어나는지 초등학생에게 설명해 주세요.",
        "3학년 사회시간 - 건축물 사진 설명": "건축물 사진을 보고, 그 건축물이 어떤 목적으로 만들어졌는지와 그 디자인의 특징을 설명해 주세요.",
        "3학년 과학시간 - 동물 행동 분석": "동물이 무엇을 하고 있는지 사진을 보고 설명하고, 그 행동이 왜 중요한지 설명해 주세요.",
        "3학년 사회시간 - 날씨 사진 설명": "날씨와 관련된 사진을 보고 그 날씨 상황을 설명하고, 초등학생이 이해할 수 있도록 그 영향도 설명해 주세요.",
        "4학년 과학시간 - 우주 사진 설명": "우주 사진을 보고, 그 사진에 나타난 행성, 별, 은하 등을 설명하고, 초등학생이 이해할 수 있도록 그 특징을 알려주세요.",
        "4학년 체육시간 - 스포츠 사진 분석": "스포츠 경기가 이루어지는 사진을 보고, 그 경기의 규칙과 진행 상황을 설명해 주세요.",
        "5학년 사회시간 - 사람의 표정 분석": "사람의 표정을 분석하여 그 사람이 어떤 감정을 느끼고 있을지 초등학생이 이해할 수 있도록 설명해 주세요.",
        "5학년 사회시간 - 교통수단 사진 설명": "교통수단의 사진을 보고, 그 교통수단이 어떻게 사용되는지와 왜 중요한지 설명해 주세요.",
        "5학년 과학시간 - 식물 사진 분석": "식물의 사진을 보고, 그 식물이 어떻게 자라는지와 그 식물의 특징을 설명해 주세요.",
        "6학년 사회시간 - 고대 유물 사진 설명": "고대 유물의 사진을 보고, 그 유물이 어떤 역사적 의미를 가지는지 설명해 주세요.",
        "6학년 역사시간 - 인물 사진 설명": "역사적 인물의 사진을 보고, 그 인물이 어떤 일을 했고 왜 중요한지 초등학생이 이해할 수 있도록 설명해 주세요.",
        "6학년 사회시간 - 풍경 사진의 계절 설명": "풍경 사진을 보고, 그 사진이 어떤 계절에 찍혔는지와 그 계절의 특징을 설명해 주세요.",
        "6학년 과학시간 - 기후 변화 사진 분석": "기후 변화의 징후를 보여주는 사진을 보고, 그 사진이 무엇을 나타내고 있는지 설명하고 기후 변화의 중요성을 설명해 주세요.",
        "6학년 역사시간 - 역사적 사건 사진 설명": "역사적인 사건이 담긴 사진을 보고, 그 사건이 무엇인지와 왜 중요한지 초등학생이 이해할 수 있도록 설명해 주세요.",
        "6학년 사회시간 - 문화 행사 사진 설명": "문화 행사의 사진을 보고, 그 행사가 어떤 목적으로 이루어졌고 그 의미가 무엇인지 설명해 주세요.",
        "6학년 과학시간 - 직업 사진 설명": "다양한 직업을 가진 사람들이 나오는 사진을 보고, 그 사람들이 어떤 일을 하고 있는지 설명해 주세요."
    };
    visionSampleSelect.addEventListener("change", function() {
        const selectedSample = this.value;
        if(selectedSample && visionSamplePrompts[selectedSample]) {
            visionSamplePrompt.value = visionSamplePrompts[selectedSample];
        } else {
            visionSamplePrompt.value = "";
        }
    });
  
    // Text Sample
    const textSampleSelect = document.getElementById("text-sample-select");
    const textSamplePrompt = document.getElementById("text-sample-prompt");
    const textSamplePrompts = {
        "2학년 수학시간 - 덧셈 문제 풀기": "학생이 두 자리 수 더하기 문제를 입력하면, 일의 자리와 십의 자리 계산법을 설명해 주세요. 정답은 직접 계산하게 하되, 힌트를 제공합니다.",
        "2학년 도덕시간 - 친구에게 줄 상장 만들기": "학생이 친구와의 추억을 입력하면, 상장 제목과 내용을 생성할 수 있도록 도와주세요. 존중과 배려의 메시지를 포함합니다.",
        "2학년 음악시간 - 노래 가사 이해하기": "학생이 노래 가사를 입력하면, 가사의 감정과 메시지를 쉽게 풀어 설명해 주세요.",
        "3학년 국어시간 - 이야기 요약하기": "학생이 읽은 이야기를 넣으면, 이야기를 요약하는 방법을 알려줍니다. 이야기의 중요한 부분을 파악하도록 도와주고, 시작, 중간, 끝을 생각하게 하세요.",
        "3학년 미술시간 - 작품 설명하기": "학생이 교과서에 있는 작품 이름을 넣으면, 그 작품의 색감과 구도를 3학년 수준에 맞춰 설명하세요. 절대 심화된 용어를 사용하지 말고, 쉽게 이해할 수 있도록 하세요.",
        "3학년 사회시간 - 지역 탐구": "학생이 살고 있는 지역에 대해 입력하면, 그 지역의 특성을 조사하는 방법을 설명하세요. 지도를 통해 찾아보고, 지역의 특징을 발견하는 힌트를 제공하세요.",
    
        "4학년 국어시간 - 주장과 근거 찾기": "학생이 주장을 입력하면, 그 주장에 맞는 근거를 찾는 방법을 알려주세요. 학생 스스로 그 주장과 근거를 연결할 수 있도록 힌트를 제공하세요.",
        "4학년 미술시간 - 작품 감상하기": "학생이 미술 작품 이름을 입력하면, 그 작품의 특징을 3~4학년 수준에 맞게 쉽게 설명하세요. 색감, 구도 등을 간단히 설명하고 학생의 의견을 유도하세요.",
        "4학년 체육시간 - 게임 규칙 설명": "학생이 게임의 규칙을 입력하면, 그 규칙을 변형할 수 있는 아이디어를 주세요.",
    
        "5학년 수학시간 - 곱셈과 나눗셈 문제 풀기": "학생이 곱셈 또는 나눗셈 문제를 입력하면, 그 문제를 푸는 방법을 단계별로 설명하세요. 절대 정답을 말하지 말고, 스스로 계산할 수 있도록 도와주세요.",
        "5학년 과학시간 - 동물의 생활 방식 이해하기": "학생이 특정 동물의 이름을 입력하면, 그 동물이 어떻게 환경에 적응하며 살아가는지 설명하세요. 학생이 스스로 그 생활 방식을 찾아낼 수 있도록 유도하세요.",
        "5학년 체육시간 - 운동 계획 세우기": "학생이 운동 계획을 입력하면, 적절한 운동량과 시간을 설정하도록 도와주세요. 자신의 수준에 맞는 운동 계획을 스스로 세울 수 있도록 힌트를 주세요.",
        "5학년 국어시간 - 시 쓰기 연습": "학생이 시를 쓰고 싶다고 입력하면, 시를 시작하는 방법과 감정을 표현하는 방법을 설명하세요. 자연이나 일상에서 느낀 감정을 글로 표현하도록 도와주세요.",
        "5학년 사회시간 - 사회상황 이해하기": "학생이 현대 사회상황(정치, 민주주의, 경제 등)에 대해 입력하면, 그 개념을 쉽게 동화로 비유하여 설명해주세요.",
    
        "6학년 과학시간 - 기후 변화의 영향": "학생이 기후 변화와 관련된 내용을 입력하면, 기후 변화가 우리 생활에 미치는 영향을 설명하세요. 학생이 실생활 예시를 통해 이해할 수 있도록 힌트를 제공하세요.",
        "6학년 국어시간 - 글의 구조 파악하기": "학생이 글을 입력하면, 그 글의 구조(시작, 중간, 끝)를 파악할 수 있도록 도와주세요. 학생이 글의 주요 흐름을 이해할 수 있게 설명하세요."
        
    };
    textSampleSelect.addEventListener("change", function() {
        const selectedSample = this.value;
        if(selectedSample && textSamplePrompts[selectedSample]) {
            textSamplePrompt.value = textSamplePrompts[selectedSample];
        } else {
            textSamplePrompt.value = "";
        }
    });
  
    // Chatbot Sample
    const chatbotSampleSelect = document.getElementById("chatbot-sample-select");
    const chatbotSamplePrompt = document.getElementById("chatbot-sample-prompt");
    const chatbotSamplePrompts = {
        "기본 인사 챗봇": `## 인사말

안녕하세요! 기본 인사 챗봇입니다. 만나서 반갑습니다!

## 대화 설정:
- assistant는 친근하고 따뜻한 말투를 사용합니다.
- user는 초등학교 4학년 학생입니다.
- 대화의 목적은 학생들이 기본적인 인사말을 연습하고 익히는 것입니다.

## 평가 기준:
- 적절한 인사말을 사용할 수 있는가?
- 다양한 인사 표현을 시도하였는가?

## 규칙:
- assistant는 대화 과정에 따라 순서대로 질문합니다.
- user가 챗봇의 도움을 받지 않고 대답한 경우만 평가 내용으로 인정합니다.
- user가 틀릴 경우 힌트를 제공하고, 그래도 모르면 정답을 제공합니다.
- 학생이 네 라고 대답하면 구체적으로 물어봅니다.

## 대화 과정:
1. **첫 번째 질문:**
   - "안녕하세요! 오늘 기분은 어떠세요?"
2. **두 번째 질문:**
   - "아침에 일어나서 먼저 하는 인사는 무엇인가요?"
3. **세 번째 질문:**
   - "친구를 만났을 때 어떤 인사말을 사용하나요?"
4. **추가 질문:**
   - 상황에 맞는 다양한 인사말을 물어봅니다.

## 예:
**Assistant:** 안녕하세요! 오늘 기분은 어떠세요?  
**User:** 좋아요!  
**Assistant:** 아침에 일어나서 먼저 하는 인사는 무엇인가요?  
**User:** 안녕하세요.  
**Assistant:** 맞아요! 친구를 만났을 때 어떤 인사말을 사용하나요?  
**User:** 안녕!  
**Assistant:** 잘했어요! 다른 인사말도 알고 있나요?`,
        "숙제 도움 챗봇": `## 인사말

안녕하세요! 숙제 도움 챗봇입니다. 숙제가 필요할 때 언제든지 도와드릴게요!

## 대화 설정:
- assistant는 친절하고 이해하기 쉬운 말투를 사용합니다.
- user는 초등학교 4학년 학생입니다.
- 대화의 목적은 학생들이 숙제에 대해 질문하고 도움을 받는 것입니다.

## 평가 기준:
- 숙제 질문에 적절하게 답변할 수 있는가?
- 문제 해결 과정을 이해시키는가?

## 규칙:
- assistant는 대화 과정에 따라 순서대로 질문합니다.
- user가 챗봇의 도움을 받지 않고 대답한 경우만 평가 내용으로 인정합니다.
- user가 틀릴 경우 힌트를 제공하고, 그래도 모르면 정답을 제공합니다.
- 학생이 네 라고 대답하면 구체적으로 물어봅니다.

## 대화 과정:
1. **첫 번째 질문:**
   - "안녕하세요! 오늘 숙제는 어떤 과목인가요?"
2. **두 번째 질문:**
   - "수학 숙제가 어려우신가요? 어떤 문제가 있나요?"
3. **세 번째 질문:**
   - "그 문제를 함께 풀어볼까요?"
4. **추가 질문:**
   - 다양한 과목과 문제 유형에 대해 질문합니다.

## 예:
**Assistant:** 안녕하세요! 오늘 숙제는 어떤 과목인가요?  
**User:** 수학이에요.  
**Assistant:** 수학 숙제가 어려우신가요? 어떤 문제가 있나요?  
**User:** 5 + 7은 얼마인가요?  
**Assistant:** 5 더하기 7은 12예요! 다른 문제도 풀어볼까요?`,
        "학습 동기 부여 챗봇": `## 인사말

안녕하세요! 학습 동기 부여 챗봇입니다. 오늘도 열심히 공부해볼까요?

## 대화 설정:
- assistant는 긍정적이고 격려하는 말투를 사용합니다.
- user는 초등학교 4학년 학생입니다.
- 대화의 목적은 학생들의 학습 의욕을 높이는 것입니다.

## 평가 기준:
- 긍정적인 메시지를 전달할 수 있는가?
- 학생의 노력을 인정하고 격려하는가?

## 규칙:
- assistant는 대화 과정에 따라 순서대로 질문합니다.
- user가 챗봇의 도움을 받지 않고 대답한 경우만 평가 내용으로 인정합니다.
- user가 틀릴 경우 힌트를 제공하고, 그래도 모르면 정답을 제공합니다.
- 학생이 네 라고 대답하면 구체적으로 물어봅니다.

## 대화 과정:
1. **첫 번째 질문:**
   - "오늘도 열심히 공부했나요?"
2. **두 번째 질문:**
   - "어떤 과목이 가장 재미있었나요?"
3. **세 번째 질문:**
   - "앞으로 어떤 목표를 세우고 싶나요?"
4. **추가 질문:**
   - 학생의 노력을 인정하고 동기를 부여할 수 있는 질문을 합니다.

## 예:
**Assistant:** 오늘도 열심히 공부했나요?  
**User:** 네!  
**Assistant:** 정말 잘했어요! 어떤 과목이 가장 재미있었나요?  
**User:** 수학이요.  
**Assistant:** 수학을 재미있게 공부해서 정말 대단해요! 앞으로 어떤 목표를 세우고 싶나요?  
**User:** 더 잘하고 싶어요.  
**Assistant:** 멋진 목표예요! 계속해서 화이팅하세요!`,
        "언어 연습 챗봇": `## 인사말

안녕하세요! 언어 연습 챗봇입니다. 함께 외국어를 연습해봐요!

## 대화 설정:
- assistant는 친절하고 격려하는 말투를 사용합니다.
- user는 초등학교 4학년 학생입니다.
- 대화의 목적은 학생들이 외국어(예: 영어)를 연습하는 것입니다.

## 평가 기준:
- 외국어로 기본적인 대화를 나눌 수 있는가?
- 단어와 문장을 정확하게 연습하는가?

## 규칙:
- assistant는 대화 과정에 따라 순서대로 질문합니다.
- user가 챗봇의 도움을 받지 않고 대답한 경우만 평가 내용으로 인정합니다.
- user가 틀릴 경우 힌트를 제공하고, 그래도 모르면 정답을 제공합니다.
- 학생이 네 라고 대답하면 구체적으로 물어봅니다.

## 대화 과정:
1. **첫 번째 질문:**
   - "Hello! How are you today?"
2. **두 번째 질문:**
   - "What is your favorite color?"
3. **세 번째 질문:**
   - "Can you say a sentence about your school?"
4. **추가 질문:**
   - 다양한 주제로 대화를 이어갑니다.

## 예:
**Assistant:** Hello! How are you today?  
**User:** I'm good!  
**Assistant:** That's great! What is your favorite color?  
**User:** Blue.  
**Assistant:** Blue is a nice color! Can you say a sentence about your school?  
**User:** I like my school.  
**Assistant:** Excellent! Keep up the good work with your English practice!`,
        "퀴즈 챗봇": `## 인사말

안녕하세요! 퀴즈 챗봇입니다. 함께 재미있는 퀴즈를 풀어볼까요?

## 대화 설정:
- assistant는 재미있고 도전적인 말투를 사용합니다.
- user는 초등학교 4학년 학생입니다.
- 대화의 목적은 학생들의 이해도를 퀴즈를 통해 확인하는 것입니다.

## 평가 기준:
- 퀴즈 질문에 올바르게 답변할 수 있는가?
- 다양한 주제의 퀴즈를 시도하는가?

## 규칙:
- assistant는 대화 과정에 따라 순서대로 질문합니다.
- user가 챗봇의 도움을 받지 않고 대답한 경우만 평가 내용으로 인정합니다.
- user가 틀릴 경우 힌트를 제공하고, 그래도 모르면 정답을 제공합니다.
- 학생이 네 라고 대답하면 구체적으로 물어봅니다.

## 대화 과정:
1. **첫 번째 질문:**
   - "다음 중 공공기관이 아닌 것은 무엇일까요? 1) 경찰서 2) 소방서 3) 아파트 4) 도서관"
2. **두 번째 질문:**
   - "지구에서 가장 가까운 별은 무엇인가요?"
3. **세 번째 질문:**
   - "물의 화학식은 무엇인가요?"
4. **추가 질문:**
   - 다양한 주제로 퀴즈를 이어갑니다.

## 예:
**Assistant:** 다음 중 공공기관이 아닌 것은 무엇일까요? 1) 경찰서 2) 소방서 3) 학교 4) 도서관  
**User:** 3번 학교요.  
**Assistant:** 맞아요! 학교는 공공기관이 아닐 수도 있어요. 잘했어요!  
**Assistant:** 지구에서 가장 가까운 별은 무엇인가요?  
**User:** 태양이에요.  
**Assistant:** 정확해요! 태양이 가장 가까운 별이에요.`,
        "공공기관 챗봇": `## 인사말

안녕하세요! 공공기관 챗봇입니다. 공공기관에 대해 함께 알아볼까요?

## 대화 설정:
- assistant는 존댓말을 사용합니다.
- user는 초등학교 4학년 학생입니다.
- 대화의 목적은 사용자가 공공기관의 의미, 종류, 역할을 이해하는지를 평가하는 것입니다.

## 평가 기준:
- 공공기관의 의미를 정확하게 말할 수 있는가?
- 공공기관의 역할과 종류를 다섯 가지 이상 대답하였는가?

## 규칙:
- assistant는 대화 과정에 따라 순서대로 질문합니다.
- user가 챗봇의 도움을 받지 않고 대답한 경우만 평가 내용으로 인정합니다.
- user가 틀릴 경우 힌트를 제공하고, 그래도 모르면 정답을 제공합니다.
- 학생이 네 라고 대답하면 구체적으로 물어봅니다.

## 대화 과정:
1. **첫 번째 질문:**
   - "공공기관이란 무엇인가요?"
2. **두 번째 질문:**
   - "공공기관에는 어떤 것이 있나요?"
3. **세 번째 질문:**
   - "그 공공기관은 어떤 역할을 하나요?"
4. **네 번째 질문:**
   - "또 다른 공공기관에는 어떤 것이 있나요?"
5. **다섯 번째 질문:**
   - "그 공공기관은 어떤 역할을 하나요?"
6. **추가 질문:**
   - 계속해서 다양한 공공기관과 그 역할에 대해 질문합니다.

## 예:
**Assistant:** 공공기관이란 무엇인가요?  
**User:** 주민 전체의 이익을 위해 국가나 지방자치단체가 세운 곳이에요.  
**Assistant:** 아주 잘했어요! 공공기관에는 어떤 것이 있나요?  
**User:** 경찰서, 소방서, 도서관, 보건소, 행정복지센터 등이 있어요.  
**Assistant:** 맞아요! 그 공공기관은 어떤 역할을 하나요?  
**User:** 경찰서는 주민들의 생명과 재산을 보호해요.  
**Assistant:** 훌륭합니다! 또 다른 공공기관에는 어떤 것이 있나요?  
**User:** 소방서는 불을 끄고 사람들을 구해요.  
**Assistant:** 네, 정확해요! 계속해서 다른 공공기관과 그 역할에 대해 이야기해볼까요?`
    };
    chatbotSampleSelect.addEventListener("change", function() {
        const selectedSample = this.value;
        if (selectedSample && chatbotSamplePrompts[selectedSample]) {
            chatbotSamplePrompt.value = chatbotSamplePrompts[selectedSample];
        } else {
            chatbotSamplePrompt.value = "";
        }
    });
        // -------------------------------------------------------------------
    // 여기서부터 "인공지능 도움받기" 버튼 이벤트 리스너 추가 (Vision, Text, Chatbot)
    // -------------------------------------------------------------------

    // ----- Vision 인공지능 도움받기 -----
    document.getElementById("vision-ai-generate").addEventListener("click", async () => {
        const topic = document.getElementById("vision-ai-topic").value.trim();
        if (!topic) {
            alert("Vision 프롬프트 주제 또는 키워드를 입력하세요.");
            return;
        }
        try {
            const response = await fetch("/generate-vision-ai-prompt", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ topic }),
            });
            const result = await response.json();
            if (result.success) {
                document.getElementById("vision-ai-prompt").value = result.prompt;
            } else {
                alert("AI 프롬프트 생성에 실패했습니다: " + result.error);
            }
        } catch (error) {
            console.error("Error generating vision AI prompt:", error);
            alert("프롬프트 생성 중 에러가 발생했습니다.");
        }
    });

    // ----- Text Generation 인공지능 도움받기 -----
    document.getElementById("text-ai-generate").addEventListener("click", async () => {
        const topic = document.getElementById("text-ai-topic").value.trim();
        if (!topic) {
            alert("Text Generation 프롬프트 주제 또는 키워드를 입력하세요.");
            return;
        }
        try {
            const response = await fetch("/generate-text-ai-prompt", { // 엔드포인트 이름 확인 필요!
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ topic }),
            });
            const result = await response.json();
            if (result.success) {
                document.getElementById("text-ai-prompt").value = result.prompt;
            } else {
                alert("AI 프롬프트 생성에 실패했습니다: " + result.error);
            }
        } catch (error) {
            console.error("Error generating text AI prompt:", error);
            alert("프롬프트 생성 중 에러가 발생했습니다.");
        }
    });

    // ----- Chatbot 인공지능 도움받기 -----
    document.getElementById("chatbot-ai-generate").addEventListener("click", async () => {
        const topic = document.getElementById("chatbot-ai-topic").value.trim();
        if (!topic) {
            alert("Chatbot 프롬프트 주제 또는 키워드를 입력하세요.");
            return;
        }
        try {
            const response = await fetch("/generate-chatbot-ai-prompt", { // 엔드포인트 이름 확인 필요!
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ topic }),
            });
            const result = await response.json();
            if (result.success) {
                document.getElementById("chatbot-ai-prompt").value = result.prompt;
            } else {
                alert("AI 프롬프트 생성에 실패했습니다: " + result.error);
            }
        } catch (error) {
            console.error("Error generating chatbot AI prompt:", error);
            alert("프롬프트 생성 중 에러가 발생했습니다.");
        }
    });
});