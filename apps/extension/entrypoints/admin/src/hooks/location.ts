import pcaCodeData from "../assets/data/pca-code.json";
import hkMoTw from "../assets/data/HK-MO-TW.json";
import { genIdFromText } from "@/common/utils";

export function useLocation() {

    const getLocationId = (value: string[]) => {
        if (value && value.length > 0) {
            let id = "";
            value.forEach(item => {
                id += `${genIdFromText(item)}-`;
            });
            return id.slice(0, -1);
        } else {
            return "";
        }
    }

    const getAllData = () => {
        const result = [];
        result.push(...pcaCodeData, ...genHK_MO_TW_CodeName(hkMoTw));
        return result;
    }

    const genHK_MO_TW_CodeName = (provinces) => {
        const provincesList = [];
        const provincesKeys = Object.keys(provinces);
        provincesKeys.forEach(element => {
            const provincesResult = { code: element, name: element, children: [] };
            const city = provinces[element];
            const cityKeys = Object.keys(city);
            cityKeys.forEach(element => {
                const cityResult = { code: element, name: element, children: [] };
                const area = city[element];
                area.forEach(element => {
                    const areaResult = { code: element, name: element };
                    cityResult.children.push(areaResult)
                })
                provincesResult.children.push(cityResult);
            });
            provincesList.push(provincesResult);
        });
        return provincesList;
    }

    return { genHK_MO_TW_CodeName, getAllData, getLocationId }
}

export default useLocation;