function handleUpload(event) {
    event.preventDefault();

    // 1번 파일 처리
    const file1Input = document.getElementById('file1');
    const file1 = file1Input.files[0];

    // 2번 파일 처리
    const file2Input = document.getElementById('file2');
    const file2 = file2Input.files[0];

    if (file1 && file2) {
        handleExcelFile(file1, file2);
    }
}

function normalizePrice(price) {
    // 가격이 1000으로 나누어 떨어지지 않는 경우 1000에서 나머지를 뺌
    if (price % 1000 !== 0) {
        return price - (price % 1000) + 1000;
    }
    return price;
}

function handleExcelFile(file1, file2) {
    const reader1 = new FileReader();

    reader1.onload = function (e1) {
        const content1 = e1.target.result;

        // XLSX 패키지 사용하여 1번 파일 데이터 읽어오기
        const workbook = XLSX.read(content1, { type: 'binary' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // "EAN Number"와 "인상가"에 해당하는 열 찾기
        const headerRow = rows[0];
        const eanIndex = headerRow.indexOf("EAN Number");
        const priceIndex = headerRow.indexOf("인상가");

        // 여기서 제품 ID와 인상된 가격 추출 및 변수에 저장
        const productIDList = [];
        const priceList = [];

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const productID = row[eanIndex];
            
            // 빈셀이 아닌 경우에만 추가
            if (productID !== undefined) {
                let price = parseInt(row[priceIndex]); // 가격을 정수로 변환
                price = normalizePrice(price); // 가격 정규화

                productIDList.push(productID);
                priceList.push(price);
            }
        }

        // 2번 파일 처리
        handleXMLFile(file2, productIDList, priceList);
    };

    reader1.readAsBinaryString(file1);
}

function handleXMLFile(file2, productIDList, priceList) {
    const reader2 = new FileReader();

    reader2.onload = function (e2) {
        const content2 = e2.target.result;

        // XML 데이터 읽어오기
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(content2, "text/xml");

        // 제품 ID와 인상된 가격 업데이트
        const updatedProductList = [];
        const notUpdatedProductList = [];
        const extraXmlIDs = [];

        console.log( productIDList.length);
        for (let i = 0; i < productIDList.length; i++) {
            const productID = productIDList[i];
            const price = priceList[i];

            // XML에서 제품 ID 검색
            const productNode = xmlDoc.querySelector(`price-table[product-id="${productID}"]`);

            if (productNode) {
                // 제품 ID가 있으면 가격 업데이트
                const amountNode = productNode.querySelector("amount");
                amountNode.textContent = price;
                updatedProductList.push(productID);
                console.log('업데이트 완료 ID:', productID);
            } else {
                // 제품 ID가 없으면 업데이트되지 않은 리스트에 추가
                notUpdatedProductList.push(productID);
                console.log('업데이트 실패 ID:', productID);
            }
        }

        // XML에서 엑셀 파일에 없는 ID 찾기
        const xmlProductNodes = xmlDoc.querySelectorAll('price-table');
        xmlProductNodes.forEach((node) => {
            const xmlProductID = node.getAttribute('product-id');
            if (!productIDList.includes(xmlProductID)) {
                extraXmlIDs.push(xmlProductID);
            }
        });

        // 로그 출력 함수 호출
        printLogs(updatedProductList, notUpdatedProductList, extraXmlIDs);

        // 파일 다운로드 함수 호출
        downloadFile(xmlDoc);

    };

    reader2.readAsText(file2);
}

function printLogs(updatedProductList, notUpdatedProductList, extraXmlIDs) {
    // 콘솔에 업데이트된 제품 ID 리스트 출력
    console.log('업데이트된 제품 ID 리스트:', updatedProductList);

    // 콘솔에 업데이트되지 않은 제품 ID 리스트 출력
    console.log('업데이트되지 않은 제품 ID 리스트:', notUpdatedProductList);

    // 콘솔에 XML에만 있는 제품 ID 리스트 출력
    console.log('XML에만 있는 제품 ID 리스트:', extraXmlIDs);

    
}

function downloadFile(xmlDoc) {
    // 현재 시간을 이용하여 파일명 생성
    const currentDate = new Date();
    const fileName = `updated_${currentDate.toISOString().replace(/[-:.]/g, '').replace('T', '_').replace('Z', '')}.xml`;

    // 모든 과정이 끝나면 XML 파일 다운로드
    const updatedXmlString = new XMLSerializer().serializeToString(xmlDoc);
    const blob = new Blob([updatedXmlString], { type: 'application/xml' });

    // 링크를 만들어서 다운로드 링크에 추가
    const downloadLink = document.getElementById('downloadLink');
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = fileName;

    // 링크를 보이도록 설정
    downloadLink.style.display = 'inline-block';
    document.getElementById('downloadLinkContainer').style.display = 'inline-block';
}
